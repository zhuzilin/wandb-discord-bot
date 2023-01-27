'use strict';

const fs = require('fs').promises;
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { groupBy, responses, failedResponse, failedResponses, post, isProjectPath, isRunPath } = require('./utils');

async function imageCommand(discord_username, project, runs, keys) {
  runs = runs.split(',').map(run => `${project}/${run}`);
  for (const run of runs) {
    if (!isRunPath(run)) {
      return failedResponse(
        `${run} is not path of a run, should be of form username/project/run.`,
      );
    }
  }
  keys = keys.split(',');

  const resp = await post('http://localhost:8427/image', {
    discord_username,
    runs,
    keys,
  });
  if (resp.error_message) {
    return failedResponse(resp.error_message);
  }

  const messages = [];
  for (let i = 0; i < resp.images.length; i++) {
    const [key, base64_img] = resp.images[i];
    const buff = Buffer.from(base64_img, 'base64');
    const image_path = `${project}/${key}.png`.replaceAll('/', '-');
    await fs.writeFile(`tmp/${image_path}`, buff);
    const attachment = new AttachmentBuilder(`tmp/${image_path}`, { name: image_path });
    const embed = new EmbedBuilder()
      .setTitle(`${project}`)
      .setURL(`https://wandb.ai/${project}`)
      .setImage(`attachment://${image_path}`);

    messages.push({ embeds: [embed], files: [attachment] });
  }
  return responses(messages);
}

async function loginCommand(discord_username, wandb_api_key) {
  const resp = await post('http://localhost:8427/login', {
    discord_username,
    wandb_api_key,
  });
  if (resp.error_message) {
    return failedResponse(resp.error_message);
  }

  if (resp.logged_in) {
    return responses(['Logged in.']);
  } else {
    return failedResponse(
      'Failed to logged in. Maybe a wrong `WANDB_API_KEY`?\n' +
      'You can find your `WANDB_API_KEY` at: https://wandb.ai/authorize',
    );
  }
}

async function projectCommand(discord_username, project, topk, filters, order) {
  if (!isProjectPath(project)) {
    return failedResponse(
      `${project} is not a valid project path, should be of form username/project.`,
    );
  }
  topk = topk ?? 0;
  if (filters) {
    try {
      JSON.parse(filters);
    } catch (e) {
      return failedResponse(`${filters} is not a valid JSON string.`);
    }
  }
  order = order ?? '-created_at';

  const resp = await post('http://localhost:8427/project', {
    discord_username,
    project,
    topk,
    filters,
    order,
  });

  if (resp.error_message) {
    return failedResponse(resp.error_message);
  }

  const messages = [];
  const num_runs = resp.runs_info.length;
  const num_runs_per_embed = 20;
  for (let i = 0; i < num_runs; i += num_runs_per_embed) {
    const start = i;
    const end = Math.min(i + num_runs_per_embed, num_runs);
    const title = `${project}` + (num_runs > num_runs_per_embed ? `runs ${start + 1} - ${end}` : '');
    let embed = new EmbedBuilder()
      .setTitle(title)
      .setThumbnail('https://avatars.githubusercontent.com/u/26401354?s=200&v=4')
      .setURL(`https://wandb.ai/${project}`);
    for (let j = start; j < end; j++) {
      const entry = resp.runs_info[j];
      embed = embed.addFields({
        name: entry.id,
        value: `- group: ${entry.group}\n- state: ${entry.state}`,
      });
    }
    messages.push({ embeds: [embed] });
  }
  return responses(messages);
}

async function summaryCommand(discord_username, run, filters) {
  if (!isRunPath(run)) {
    return failedResponse(
      `${run} is not a valid run path, should be of form username/project/run.`,
    );
  }
  filters = (filters ?? '').split(',').filter(x => x);
  const filter = filters.length === 0 ?
    () => true :
    (group_key, sub_key) => (filters.includes(group_key) || filters.includes(`${group_key}/${sub_key}`));

  const resp = await post('http://localhost:8427/summary', {
    discord_username,
    run_path: run,
  });
  if (resp.error_message) {
    return failedResponse(resp.error_message);
  }

  const entries = Object.entries(resp.summary).map((entry) => {
    const key = entry[0];
    const value = entry[1];
    const splits = key.split('/');
    const group_key = splits.length > 1 ? splits[0] : '_default';
    const sub_key = splits.length > 1 ? splits.slice(1).join('/') : key;
    return { group_key, sub_key, value };
  });
  const grouped_entries = groupBy(entries, ({ group_key }) => group_key);
  const run_info = run.split('/');

  let embed = new EmbedBuilder()
    .setTitle(`${run}`)
    .setThumbnail('https://avatars.githubusercontent.com/u/26401354?s=200&v=4')
    .setURL(`https://wandb.ai/${run_info[0]}/${run_info[1]}`);
  for (const group_key in grouped_entries) {
    grouped_entries[group_key]
      .sort((a, b) => (a.sub_key <= b.sub_key));
    let text = '';
    for (const value of grouped_entries[group_key]) {
      if (filter(group_key, value.sub_key)) {
        text += `- **${value.sub_key}**: ${value.value}\n`;
      }
    }
    if (text !== '') {
      if (text.length > 1024) {
        text = text.slice(0, 1000) + '\n...\n';
      }
      embed = embed.addFields({ name: group_key, value: text });
    }
  }
  return responses([{ embeds: [embed] }]);
}

async function runCommands(discord_username, commands) {
  let all_messages = [];
  for (const { type, params } of commands) {
    switch (type) {
      case '/image': {
        const { project, runs, keys } = params;
        const { success, messages } = await imageCommand(discord_username, project, runs, keys);
        all_messages = all_messages.concat(messages);
        if (!success) {
          return failedResponses(all_messages);
        }
        break;
      }
      case '/login': {
        const { key } = params;
        const { success, messages } = await loginCommand(discord_username, key);
        all_messages = all_messages.concat(messages);
        if (!success) {
          return failedResponses(all_messages);
        }
        break;
      }
      case '/project': {
        const { project, topk, filters, order } = params;
        const { success, messages } = await projectCommand(discord_username, project, topk, filters, order);
        all_messages = all_messages.concat(messages);
        if (!success) {
          return failedResponses(all_messages);
        }
        break;
      }
      case '/summary': {
        const { run, filters } = params;
        const { success, messages } = await summaryCommand(discord_username, run, filters);
        all_messages = all_messages.concat(messages);
        if (!success) {
          return failedResponses(all_messages);
        }
        break;
      }
      default: {
        all_messages.push(`unknown command: ${type}`);
        return failedResponses(all_messages);
      }
    }
  }
  return responses(all_messages);
}

module.exports = {
  imageCommand,
  loginCommand,
  projectCommand,
  summaryCommand,
  runCommands,
};
