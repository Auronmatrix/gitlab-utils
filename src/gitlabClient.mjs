import fetch from 'node-fetch'
import gbk from '@gitbeaker/node';
const { Gitlab } = gbk;

const post = async (url, body = {}) => {
    const result = await fetch(url, { method: 'POST', body })
    return result.json()
}

const del = async (url, body = {}) => {
    const result = await fetch(url, { method: 'POST', body })
    return result.json()
}


export class GitlabClient {
    constructor(opts) {
        this.api = new Gitlab(opts)
        this.summary = []
        this.baseUrl = opts.baseUrl
        this.token = opts.token
    }

    cancelProjectPendingPipelines = async (projectId) => {
        const pipelines = await this.paginate(`${this.baseUrl}/projects/${projectId}/pipelines?status=pending&private_token=${this.token}`)
        for (let pipeline of pipelines) {
            console.log("cancel pipeline", pipeline.id)
            const url = `${this.baseUrl}/projects/${projectId}/pipelines/${pipeline.id}/cancel?private_token=${this.token}`
            console.log(url)
            const res = await post(url)
            console.log(res)
        }
    }

    recursiveSummaryLookup = async (parentGroupId) => {
        const subgroups = await this.api.Groups.all({ id: parentGroupId })

        for (let subgroup of subgroups) {
            console.log('subgroup', subgroup.name)
            const projects = await this.api.Groups.projects(subgroup.id)
            subgroup.projects = []

            for (let project of projects) {
                console.log('project', project.name)
                const tags = await this.getProjectTags(project.id)
                project.tags = tags
                subgroup.projects.push(project)
            }

            this.summary.push(subgroup)
            await this.recursiveSummaryLookup(subgroup.id)
        }

        const rootGroup = { id: parentGroupId, name: "rootGroup" }
        const rootProjects = await this.api.Groups.projects(parentGroupId)
        rootGroup.projects = []

        for (let rootProject of rootProjects) {
            console.log('project', rootProject.name)
            const tags = await this.getProjectTags(rootProject.id)
            rootProject.tags = tags
            rootGroup.projects.push(rootProject)
        }

        this.summary.push(rootGroup)
        return this.summary
    }

    paginate = async (url) => {
        let page = 1
        let morePages = true
        const allResults = []
        while (morePages) {
            const response = await fetch(`${url}&page=${page}&per_page=50`)
            const results = await response.json()
            if (results) {
                allResults.push(...results)
            }
            console.log("Found " + results.length)
            if (results.length === 0) {
                console.log("No items/pages left")
                morePages = false
            } else {
                page += 1
            }
        }
        return allResults
    }

    getProjectTags = async (id) => {
        return await this.paginate(`${this.baseUrl}/projects/${id}/repository/tags?private_token=${this.token}`)
    }

    mapSummaryToPipelineRuns = (summary) => {
        const runs = []
        for (let group of summary) {
            for (let project of group.projects) {
                for (let tag of project.tags) {
                    runs.push({ groupId: group.id, groupName: group.name, projectId: project.id, projectName: project.name, tagName: tag.name })
                }
            }
        }

        return runs
    }

    runPipelineForTag = async (projectId, tag) => {
        await post(`${this.baseUrl}/projects/${projectId}/pipeline?ref=${tag}&private_token=${this.token}`)
    }



    deleteProjectPendingPipelines = async (projectId) => {
        const pipelines = await this.paginate(`${this.baseUrl}/projects/${projectId}/pipelines?status=pending&private_token=${this.token}`)
        for (let pipeline of pipelines) {
            console.log("delete pipeline", pipeline.id)
            const res = await del(`${this.baseUrl}/projects/${projectId}/pipelines/${pipeline.id}&private_token=${this.token}`)
            console.log(res)
        }
    }

    cancelPipelinesForAllProjects = async (summary) => {
        for (let group of summary) {
            for (let project of group.projects) {
                console.log('project-cancel-pipelines', project.name)
                await this.cancelProjectPendingPipelines(project.id)
            }
        }
    }

    deletePipelinesForAllProjects = async (summary) => {
        for (let group of summary) {
            for (let project of group.projects) {
                console.log('project-delete-pipelines', project.name)
                await this.deleteProjectPendingPipelines(project.id)
            }
        }
    }

    runners = async () => {
        const response = await fetch(`${this.baseUrl}/runners?scope=active&private_token=${this.token}`)
        const runners = await response.json()
        let jobs = []
        for (let runner of runners) {
            const jobResponse = await fetch(`${this.baseUrl}/runners/${runner.id}/jobs?status=running&private_token=${this.token}`)
            jobs = await jobResponse.json()
            for (let job of jobs) {
                console.log(job.web_url)
            }
        }
        return jobs
    }
}

export default GitlabClient