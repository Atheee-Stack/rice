// jest.preset.js
import nxPreset from '@nx/jest/preset/index.js'; // 添加文件扩展名

export default {
  ...nxPreset,

  // 添加ESM配置
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
          },
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
};