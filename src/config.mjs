

import dotenv from 'dotenv'
const { config } = dotenv;

const configGuard = () => {
    if (!process.env.GITLAB_ROOT_GROUP_ID) {
        console.error("Set GITLAB_ROOT_GROUP_ID environment variable or add .env file to use this app")
        process.exit(1)
    }

    if (!process.env.GITLAB_TOKEN) {
        console.error("Set GITLAB_TOKEN environment variable or add .env file to use this app")
        process.exit(1)
    }

    if (!process.env.GITLAB_HOST) {
        console.warn("GITLAB_URL is not set. Defaulting to https://gitlab.com")
    }
}

export default () => {
    config()
    configGuard()
    const { GITLAB_TOKEN, GITLAB_HOST, GITLAB_ROOT_GROUP_ID, GITLAB_SUMMARY_PATH, GITLAB_EXCLUDED_PROJECT_NAMES } = process.env
    const rootGroupId = GITLAB_ROOT_GROUP_ID || undefined
    const summaryPath = GITLAB_SUMMARY_PATH || './summary.json'
    const excludedProjectNames = GITLAB_EXCLUDED_PROJECT_NAMES ? GITLAB_EXCLUDED_PROJECT_NAMES.split(";") : []
    
    console.warn('excluded projects', excludedProjectNames)
    return {
        rootGroupId,
        summaryPath,
        excludedProjectNames,
        gitlabOptions: {
            token: GITLAB_TOKEN,
            host: GITLAB_HOST,
            version: 4,
            baseUrl: `${GITLAB_HOST}/api/v4`
        }
    }

}

