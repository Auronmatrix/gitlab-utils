




import loadAppConfig from './src/config.mjs'
const appConfig = loadAppConfig()

import { readSummary, writeSummary, shouldExclude, snooze } from './src/utils.mjs'
import { GitlabClient } from './src/gitlabClient.mjs'
import gitstrip from './src/gitstrip.mjs'

const { gitlabOptions, excludedProjectNames } = appConfig

const glc = new GitlabClient(gitlabOptions)

const main = async () => {

  const { summaryPath, rootGroupId } = appConfig
  let summary = await readSummary(summaryPath)
  if (!summary) {
    console.log('No local summary stored. Rebuilding')
    summary = await glc.recursiveSummaryLookup(rootGroupId)
    await writeSummary(summaryPath, summary)
  }

  await runGitStripPerProject(summary)
}


const runNewPipelinePerTag = async (summary) => {
  let runs = glc.mapSummaryToPipelineRuns(summary)
  for (let run of runs) {
    await glc.runPipelineForTag(run.projectId, run.tagName)
    console.log(run.groupName, run.projectName, run.tagName)
    await snooze(1000)
  }
}

const cancelProjectPipelines = async (summary) => {
  await glc.cancelPipelinesForAllProjects(summary)
}

const getTagsByProjectId = async (projectId) => {
  const project = await glc.getProjectTags(projectId)
  console.log(project)
}

const runGitStripPerProject = async (summary) => {
  for (let group of summary) {
    for (let project of group.projects) {
      if (!shouldExclude(excludedProjectNames, project)) {
        await gitstrip(project)
      } else {
        console.log("PROJECT EXCLUDED")
      }
    }
  }
}

main()
