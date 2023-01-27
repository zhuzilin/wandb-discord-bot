# wandb discord bot

A discord bot for monitoring wandb project and runs.

**NOTE**: Please do not host in a public server as the `WANDB_API_KEY` maybe shown to everyone in the server.

## how to start the bot

1. Clone and install dependencies.

   ```bash
   git clone https://github.com/zhuzilin/wandb-discord-bot.git
   pip3 install -r requirements.txt
   npm install
   ```

1. Create your own discord bot according to [discord.js guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html).

1. Set the `config.json` with your own bot and server info:

   ```json
   {
     "token": "bot-token",
     "clientId": "xxx",
     "guildId": "xxx"
   }
   ```

1. Start python server for wandb:

   ```
   python3 python/main.py
   ```

1. Start bot:

   ```
   npm start
   ```
## how to use the bot

Here is an exemplary way to use this bot. For details of the slash commands, check the reference section.

1. Create a new channel in the server for your wandb project, for example, the project may be named `zhuzilin/gpt` and the channel name can be `zhuzilin-gpt`.

2. Use `/login` to log into your wandb account.

   ```
   /login key:your-WANDB_API_KEY
   ```

3. Use  `/project` command to check the info of all the runs:

   ```
   /project project:zhuzilin/gpt
   ```

   The plots in your wandb web panel may be consists of stats from multiple runs. There may be a dead run with group name `group-first` and a continue run with name `group-second`. To get more info of a run, we need use the `/project` command to  first retrieve the _run id_ of it. For example:

   ```
   /project project:zhuzilin/gpt filters:{"group": "group-first"}
   /project project:zhuzilin/gpt filters:{"group": "group-second"}
   ```

   The subtitle in the reply embed is the _run id_ of the run. It should be a random string of length 8, for example `a1b2c3d4` and `e5f6g7h8`

4. Use `/summary` command to check more info of a run:

   ```
   /summary run:zhuzilin/gpt/a1b2c3d4
   ```

   This will return all information relates to the stats of the last step of the run. If you think that's too much, you could use the `filters` option to select the ones you hope to see. `filters` is a string, in which each filter connected by `,` represents the stats you hope to show. In wandb, the stats may be of form `stats_type/stats_name`, you can use only the `states_type` as filter or the full `states_type/states_name`. For example, if we use:

   ```
   /summary run:zhuzilin/gpt/a1b2c3d4 filters:train,validation/loss,_default/state
   ```

   the bot will return `train/loss`, `train/step_time`, ... `train/lr`, `validation/loss` and `_default/state`. The `_default/state` show whether the run is still running.

5. Use `/image` command to create a plot:

   ```
   /image project:zhuzilin/gpt runs:a1b2c3d4,e5f6g7h keys:train/loss,train/lr
   ```

   The `/image` command will create a png plot with the runs and the specific stats keys. For example, the above slash command will return 2 images one for `train/loss`, one for `train/lr`.

   **NOTE**: Currently we only support keys that are submitted to wandb every steps. So it may not work for plotting stats like `validation/loss`.

6. Use `/subscribe` to create a periodically command set.

   After you have test the above commands. You may hope to check the running stats of the runs every hour, then you need to create a base64 encode of the commands you hope to run, for example, if your are using `bash`:

   ```bash
   cat <<EOF > commands
   /project project:zhuzilin/gpt topk:1
   /summary run:zhuzilin/gpt/a1b2c3d4 filters:train,validation/loss,_default/state
   /image project:zhuzilin/gpt runs:a1b2c3d4,e5f6g7h keys:train/loss
   EOF
   base64 -i commands
   ```

   With the encoded base64 commands, we could run the `/subscribe` in the channel:

   ```
   /subscribe interval:60 base64_command:your-base64-command
   ```

   Then the commands above will be run every 60 minutes.

   We can only subscribe to one command list in a channel -- this is by design, as the messages will be a mess otherwise, so if you hope to change the subscription, please run `/unsubscribe` in the channel.

## slash command reference

#### `/login`
Login your wandb account with your `WANDB_API_KEY`.

- Options
  - `key`: `str` _(required)_
  
    Your `WANDB_API_KEY`. You cound find it at: https://wandb.ai/authorize.

#### `/project`
Check the run id, group name and running state (running, crash or failed) of the selected runs in the project.

- Options
  - `project`: `str` _(required)_
  
    The path of the project, should be of form `username/project`.
  
  - `topk`: `int` 
  
    The number of runs to check, when setting at non-positive integer, all runs will be returned.
  
  - `filters`: `str`
  
    The filter of the runs, should be a `JSON.stringify`/`json.dumps` version of the `filters` argument for `wandb.public.Api.runs`.
  
  - `order`: `str`
  
    The way to order the runs. It is the same as  the `order` argument for `wandb.public.Api.runs`. Default is a descending order on the creation time of the runs.

#### `/summary`

Check the running state of a certain run and the stats of its last step.

- Options

  - `run`: `str` _(required)_

    The path of the run, shold be of form `username/project/run_id`.

    **NOTE**: _run_id_ is different from the _group_name_ shown on wandb web panel. You can use `/project` command to search for the _run_id_ of a run.

  - `filters`: `str`

    Filters for the stats to show, in which each filter connected by `,` represents the stats you hope to show. In wandb, the stats may be of form `stats_type/stats_name`, you can use only the `states_type` as filter or the full `states_type/states_name`.

    For example, if the `filters` is `train,validation/loss,_default/state`, the  the bot will return `train/loss`, `train/step_time`, ... `train/lr`, `validation/loss` and `_default/state`. The `_default/state` show whether the run is still running.

    Default is showing all.

#### `/image`

Plot figures of the runs.

- Options

  - `project`: `str` _(required)_

    The path of the project, should be of form `username/project`.

  - `runs`: `str` _(required)_

    The _run_id_ of the runs to be plot. They should be connected with `,`.

  - `keys`: `str` _(required)_

    The stats key to plot. They should be connected with `,`.

    **NOTE**: Currently we only support keys that are submitted to wandb every steps. So it may not work for plotting stats like `validation/loss`.

#### `/subscribe`

Subscribe a list of commands in the current channel, so that they will be run by a given time interval.

**NOTE**: We can only subscribe to one command list in a channel -- this is by design, as the messages will be a mess otherwise. If you hope to change the subscription, please run `/unsubscribe` in the channel.

- Options:

  - `interval`: `int` _(required)_

    The time interval  (minutes) between each execution. Time unit is minute.

  - `base64_command`: `str` _(required)_

    The base64 encoded command list. The text contain origin command should be consists of one line command each line (empty line will be ignored). And you could use `#` started line as comment.

    You could encode the commands like (if you are using bash):

    ```bash
    cat <<EOF > commands
    # commands for project zhuzilin/gpt
    /project project:zhuzilin/gpt topk:1
    /summary run:zhuzilin/gpt/a1b2c3d4 filters:train,validation/loss,_default/state
    /image project:zhuzilin/gpt runs:a1b2c3d4,e5f6g7h keys:train/loss
    EOF
    base64 -i commands
    ```

    **NOTE**: There should be no space between the option key and value in each command, for example:

    ```
    /summary run:zhuzilin/gpt/a1b2c3d4
    ```

    is ok, while:

    ```
    /summary run: zhuzilin/gpt/a1b2c3d4
    ```

    is not.

#### `/unsubscribe`

Unsubscribe the commands in the current channel.
