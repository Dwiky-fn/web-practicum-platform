function estimateTokens(value) {
  return Math.ceil(String(value).length / 4);
}

function shouldChunkExperiment(payload) {
  if (payload.scope !== 'experiment') {
    return false;
  }

  const contextLength = Number(process.env.AI_CONTEXT_LENGTH) || 4096;
  const safeTokenBudget = Math.floor(contextLength * 0.7);
  return estimateTokens(JSON.stringify(payload)) > safeTokenBudget;
}

function createExperimentChunks(payload) {
  if (!shouldChunkExperiment(payload)) {
    return [payload];
  }

  const contextLength = Number(process.env.AI_CONTEXT_LENGTH) || 4096;
  const maxChunkCharacters = Math.max(
    3000,
    Math.floor(contextLength * 4 * 0.35),
  );

  const chunks = [];

  payload.experiment.files.forEach((file) => {
    const lineGroups = splitLinesByCharacterBudget(
      String(file.content).split(/\r?\n/),
      maxChunkCharacters,
    );

    let lineOffset = 0;

    lineGroups.forEach((lines, chunkIndex) => {
      chunks.push({
        ...payload,
        experiment: {
          ...payload.experiment,
          files: [
            {
              ...file,
              content: lines.join('\n'),
              _lineOffset: lineOffset,
            },
          ],
        },
        _contextChunk: {
          fileId: file.id,
          filePath: file.path,
          chunkIndex,
          startLine: lineOffset + 1,
          endLine: lineOffset + Math.max(lines.length, 1),
        },
      });

      lineOffset += lines.length;
    });
  });

  return chunks;
}

function splitLinesByCharacterBudget(lines, maxCharacters) {
  if (lines.length === 0) {
    return [['']];
  }

  const groups = [];
  let currentGroup = [];
  let currentLength = 0;

  lines.forEach((line) => {
    const lineLength = line.length + 1;

    if (
      currentGroup.length > 0
      && currentLength + lineLength > maxCharacters
    ) {
      groups.push(currentGroup);
      currentGroup = [];
      currentLength = 0;
    }

    currentGroup.push(line);
    currentLength += lineLength;
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

module.exports = {
  estimateTokens,
  shouldChunkExperiment,
  createExperimentChunks,
  splitLinesByCharacterBudget,
};
