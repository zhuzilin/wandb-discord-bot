'use strict';

function parse(raw_command) {
  const raw_commands = raw_command
    .split('\n')
    .map(x => x.trim())
    .filter(x => x)
    .filter(x => x[0] !== '#');
  const commands = [];
  for (const i in raw_commands) {
    const raw_single_command = raw_commands[i];
    const { command, error_message } = parseSingleCommand(raw_single_command);
    if (error_message) {
      return { commands: null, error_message: `error in line ${i}: ${error_message}` };
    }
    commands.push(command);
  }
  return { commands, error_message: null };
}

function parseSingleCommand(raw_command) {
  const raw_pieces = raw_command.split(' ').filter(x => x);
  const command_type = raw_pieces[0];
  if (command_type[0] !== '/') {
    return {
      command: null,
      error_message: `slash command should be starting with \`/\`, got ${raw_pieces[0]}`,
    };
  }
  const param_list = [];
  for (const param of raw_pieces.slice(1).map(x => x.replace('%20', ' ')).map(x => x.split(':'))) {
    if (param.length === 1) {
      return {
        command: null,
        error_message: `slash command option should be of form \`key:val\`, got ${param} for ${command_type}`,
      };
    }
    param_list.push({ key: param[0], value: param.slice(1).join(':') });
  }
  const params = param_list.reduce((obj, kv) => {
    obj[kv.key] = kv.value;
    return obj;
  }, {});

  switch (command_type) {
    case '/image': {
      if (!('project' in params && 'runs' in params && 'keys' in params)) {
        return {
          command: null,
          error_message: `required option missing for ${command_type}`,
        };
      }
      break;
    }
    case '/login': {
      if (!('key' in params)) {
        return {
          command: null,
          error_message: `required option missing for ${command_type}`,
        };
      }
      break;
    }
    case '/project': {
      if (!('project' in params)) {
        return {
          command: null,
          error_message: `required option missing for ${command_type}`,
        };
      }
      for (const key of ['topk', 'filters', 'order']) {
        if (!(key in params)) {
          params[key] = null;
        }
      }
      break;
    }
    case '/summary': {
      if (!('run' in params)) {
        return {
          command: null,
          error_message: `required option missing for ${command_type}`,
        };
      }
      for (const key of ['filters']) {
        if (!(key in params)) {
          params[key] = null;
        }
      }
      break;
    }
    default: {
      return {
        command: null,
        error_message: `unknown command ${command_type}`,
      };
    }
  }
  return {
    command: { type: command_type, params },
    error_message: null,
  };
}


module.exports = {
  parse,
};
