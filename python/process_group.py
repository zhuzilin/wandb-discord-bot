import base64
import io
import numbers
from multiprocessing import Process, Queue
from typing import Dict, Any, List

import wandb
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns


plt.style.use('dark_background')


def colored_state(state):
    return state + (' 🟢' if state == 'running' else ' 🔴')


def wandb_loop(input_queue, output_queue):
    api = None
    while True:
        inputs = input_queue.get()
        if inputs is None:
            break
        name, payload = inputs
        print(f'start command {name}')
        try:
            if name == "login":
                assert api is None, "login the second time in wandb_loop"
                try:
                    key = payload
                    logged_in = wandb.login(key=key)
                    if logged_in:
                        api = wandb.Api(timeout=20)
                    outputs = (name, logged_in)
                except:
                    outputs = (name, False)
            else:
                assert api is not None
                if name == 'summary':
                    run_path = payload
                    run = api.run(path=run_path)
                    summary = {}
                    attrs = run.load(force=True)
                    for key, val in attrs['summaryMetrics'].items():
                        summary[key] = val
                    for key, val in attrs['systemMetrics'].items():
                        summary[key[::-1].replace('.', '/', 1)[::-1]] = val
                    summary['state'] = colored_state(attrs['state'])
                    outputs = (name, summary)
                elif name == 'project':
                    project, topk, filters, order = payload
                    runs = api.runs(path=project, filters=filters, order=order)
                    # need to use `len()` to trigger `_load_page`
                    num_runs = len(runs)
                    if topk > 0:
                        num_runs = min(topk, num_runs)
                    print(f'project {project} has {num_runs} run.')
                    runs_info = []
                    for i in range(num_runs):
                        run = runs[i]
                        attrs = run.load(force=True)
                        runs_info.append({
                            'state': colored_state(attrs['state']),
                            'group': attrs['group'],
                            'id': run.id,
                        })
                    outputs = (name, runs_info)
                elif name == 'image':
                    runs, keys = payload
                    history_dict = {key: {} for key in keys}
                    step_dict = {}
                    nan_dict = {key: {} for key in keys}
                    for run_name in runs:
                        print(f'start fetching {run_name}')
                        run = api.run(path=run_name)
                        history = run.scan_history(keys=keys)
                        rows = [row for row in history]
                        start_step = history.max_step - len(rows)
                        end_step = history.max_step
                        print(
                            f'  step {start_step} - {end_step}\n' +
                            f'  num_rows: {len(rows)}\n' +
                            f'  row[-1]: {rows[-1]}'
                        )
                        for key in keys:
                            nan_xs, nan_ys = [], []
                            values = [row[key] for row in rows]
                            # TODO: This is slow...
                            for i, value in enumerate(values):
                                if not isinstance(value, numbers.Number):
                                    values[i] = values[i - 1] if i != 0 else 0
                                    nan_xs.append(i + start_step)
                                    nan_ys.append(values[i])
                            if len(nan_ys) > 0:
                                print(f'  [{key}] NaN on step {nan_xs}')
                                nan_dict[key][run_name] = (np.array(nan_xs), np.array(nan_ys))
                            values = np.array(values)
                            history_dict[key][run_name] = values
                        step_dict[run_name] = np.array(range(start_step, end_step))

                    images = []
                    for key in keys:
                        plt.figure(0)
                        with sns.color_palette("Set2", n_colors=10):
                            for run_name in runs:
                                label = run_name.split('/')[-1]
                                plt.plot(
                                    step_dict[run_name],
                                    history_dict[key][run_name],
                                    label=label)
                                if run_name in nan_dict[key]:
                                    nan_xs, nan_ys = nan_dict[key][run_name]
                                    plt.scatter(nan_xs, nan_ys, label=f'{label}-nan')
                        plt.title(key)
                        plt.legend()
                        # save figure to buffer
                        img_buf = io.BytesIO()
                        plt.savefig(img_buf, format="png")
                        img_buf.seek(0)
                        img_base64 = base64.b64encode(img_buf.read())
                        images.append((key, img_base64))
                        plt.clf()
                    outputs = (name, images)
                else:
                    outputs = (name, None)
        except Exception as e:
            print(e)
            outputs = (name, RuntimeError("unknown internal error"))
        print(f'finish command {name}')
        output_queue.put(outputs)


class WandBProcess:
    """
    One process for each discord user so that the WANDB_API_KEY
    can be isolated.
    """

    def __init__(self, discord_username: str):
        self.discord_username = discord_username
        self.input_queue = Queue()
        self.output_queue = Queue()
        self.proc = Process(
            target=wandb_loop,
            args=(self.input_queue, self.output_queue))
        self.proc.start()

    def _logout(self):
        self.input_queue.put(None)
        self.proc.join()

    def __del__(self):
        self._logout()

    def run(self, name, payload):
        self.input_queue.put((name, payload))
        check_name, outputs = self.output_queue.get()
        assert name == check_name, f"input and output name not match: {name} != {check_name}"
        return outputs


class WandBProcessGroup:
    def __init__(self):
        self.proc_dict = {}

    def login(self, discord_username: str, wandb_api_key: str):
        if discord_username in self.proc_dict:
            del self.proc_dict[discord_username]
        proc = WandBProcess(discord_username)
        logged_in = proc.run('login', wandb_api_key)
        if logged_in:
            self.proc_dict[discord_username] = proc
        return logged_in

    def summary(self, discord_username: str, run_path: str):
        if discord_username not in self.proc_dict:
            return None
        return self.proc_dict[discord_username].run('summary', run_path)

    def project(
        self,
        discord_username: str,
        project: str,
        topk: str,
        filters: Dict[str, Any],
        order: str = "-created_at",
    ):
        if discord_username not in self.proc_dict:
            return None
        return self.proc_dict[discord_username].run('project', (project, topk, filters, order))

    def image(
        self,
        discord_username: str,
        runs: List[str],
        keys: List[str],
    ):
        if discord_username not in self.proc_dict:
            return None
        return self.proc_dict[discord_username].run('image', (runs, keys))
