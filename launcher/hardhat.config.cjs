const path = require('node:path')
const { subtask } = require('hardhat/config')
const { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } = require('hardhat/builtin-tasks/task-names')

require('@nomicfoundation/hardhat-ethers')

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(async (_, __, runSuper) => {
  const paths = await runSuper()
  return paths.filter((p) => {
    const rel = p.split(path.sep).join('/')
    return !rel.includes('/contracts/test/LauncherPadFactory.t.sol')
      && !rel.includes('/contracts/script/')
      && !rel.includes('/contracts/lib/')
  })
})

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true },
  },
  paths: {
    sources: './contracts',
    tests: './hh-test',
    cache: './contracts/cache-hh',
    artifacts: './contracts/artifacts-hh',
  },
}
