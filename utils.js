'use strict';

// Array.prototype.group doesn't seems to have been implemented...
function groupBy(entries, key_func) {
  const result = {};
  for (const entry of entries) {
    const key = key_func(entry);
    if (!(key in result)) {
      result[key] = [entry];
    } else {
      result[key].push(entry);
    }
  }
  return result;
}

function isProjectPath(project) {
  return project.split('/').length === 2;
}

function isRunPath(run_path) {
  return run_path.split('/').length === 3;
}

function failedResponse(message) {
  return failedResponses([message]);
}

function failedResponses(messages) {
  return {
    success: false,
    messages,
  };
}

function responses(messages) {
  return {
    success: true,
    messages,
  };
}

async function reply(interaction, messages, first) {
  if (first) {
    await interaction.editReply(messages[0]);
    messages = messages.slice(1);
  }
  for (const message of messages) {
    await interaction.followUp(message);
  }
}

async function post(url, body) {
  return await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(resp => resp.json());
}

module.exports = {
  groupBy,
  isProjectPath,
  isRunPath,
  failedResponse,
  failedResponses,
  responses,
  reply,
  post,
};
