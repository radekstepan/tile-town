/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    // If you have path aliases in tsconfig.json, map them here
    // Example: '^@/(.*)$': '<rootDir>/src/$1'
    // For this project, direct relative paths should work, but if not:
    '^../config/(.*)$': '<rootDir>/src/config/$1',
    '^../types$': '<rootDir>/src/types/index.ts',
    '^../utils/(.*)$': '<rootDir>/src/utils/$1',
    '^./Game$': '<rootDir>/src/game/Game.ts', // For SimulationController test
  },
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,
};
