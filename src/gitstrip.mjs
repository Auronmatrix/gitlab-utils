import sg from 'simple-git'
import { cp, rm, mkdirp } from './utils.mjs'
import path from 'path'


import dotenv from 'dotenv'
const { config } = dotenv;
config()

const { GITLAB_REMOTE_REPLACEMENT_MAP, GIT_ANON_USER, GIT_ANON_USER_EMAIL } = process.env

const autoCommitUser = GIT_ANON_USER || 'Anonymous'
const autoCommitUserEmail = GIT_ANON_USER_EMAIL || 'anon@foo.bar'
const replacementMap = GITLAB_REMOTE_REPLACEMENT_MAP ? GITLAB_REMOTE_REPLACEMENT_MAP.split(";").map(v => v.split("|")) : []

const sourceToExternalUrl = (sourceUrl) => {
    let externalUrl = sourceUrl
    replacementMap.forEach(map => {
        const [ key, val ] = map
        externalUrl = externalUrl.replace(key, val)
    })
    return externalUrl
}

const clone = async (url, path) => {
    try {
        const git = sg(path)
        await git.clone(url, path)
    } catch (e) {
        console.log('WARNING', 'gitstrip', 'clone', 'already exists', url, path)
    }
}

const checkout = async (project, tag) => {
    console.log('checkout', project, tag)
    const subGit = sg(project)
    await subGit.checkout(tag)
    const status = await subGit.status()
    console.log(status)
}

const strip = (src) => {
    console.log('strip', src)
    const gitPath = path.join(src, '.git', '/')
    rm(gitPath)
}

const anonymizeAndPush = async (dir, sourceUrl, tag) => {
    const remote = sourceToExternalUrl(sourceUrl)
    await strip(dir)
    const subGit = sg(dir)
    await subGit.addConfig('user.name', autoCommitUser)
    await subGit.addConfig('user.email', autoCommitUserEmail)
    await subGit.removeRemote('origin')
    await subGit.addRemote('origin', remote)
    await subGit.init()
    await subGit.add('.')
    await subGit.commit(`${tag.name} - Code @ sha1: ${tag.commit.short_id}...`, [], { '--author': `"${autoCommitUser} <${autoCommitUserEmail}>"` })
    await subGit.addTag(tag.name)

    try {
        await subGit.pushTags(remote)
        console.log('WARNING', 'anon', 'pushed new tag', remote, tag.name)
    } catch (e) {
        console.log('anon', 'tag exists', tag.name)
    }
    const branch = `release/${tag.name}`

    try {
        console.log('anon', 'checkout', branch)
        await subGit.checkoutBranch(branch, tag.name)
        console.log('anon', 'push', branch)
        await subGit.push(remote, branch)
        console.log('WARNING', 'anon', 'created', remote, branch)
    } catch (e) {
        console.log('anon', 'branch exists', remote, branch)
    }
}


const anonymizeAndUpdateBranch = async (dir, sourceUrl, master) => {
    const tag = {
        name: 'handover'
    }

    const remote = sourceToExternalUrl(sourceUrl)
    await strip(dir)
    const subGit = sg(dir)
    await subGit.addConfig('user.name', autoCommitUser)
    await subGit.addConfig('user.email', autoCommitUserEmail)
    await subGit.removeRemote('origin')
    await subGit.addRemote('origin', remote)
    await subGit.init()
    await subGit.add('.')
    await subGit.commit(`Code on master @ handover`, { '--author': `"${autoCommitUser} <${autoCommitUserEmail}>"` })
    await subGit.addTag(tag.name)

    try {
        console.log('anon-branch', 'force-push-master')
        await subGit.push(remote, 'master', { '--force': true })
        console.log('WARNING', 'anon-branch', 'updated master', remote, 'master')
    } catch (e) {
        console.log('ERROR', 'anon-branch', 'could-not-update-master', remote, 'master', e)
    }

    try {
        const pushTagsRes = await subGit.pushTags(remote)
        console.log(pushTagsRes)
        console.log('WARNING', 'anon-branch', 'create-tag', remote, tag.name)
    } catch (e) {
        console.log('anon-branch', 'tag exists', remote, tag.name)
    }
}

const getRemoteTags = async (projectName, sourceUrl) => {
    const remote = sourceToExternalUrl(sourceUrl)
    const externalDir = path.join('.', '/clones/externals', projectName)
    mkdirp(externalDir)
    const remoteGit = sg(externalDir)
    await remoteGit.removeRemote('origin')
    await remoteGit.addRemote('origin', remote)
    const tagsList = await remoteGit.listRemote("--tags", "origin")
    const tags = tagsList.split('\n').map(r => r.split('\t')[1]).filter(t =>  t && t.startsWith('refs/tags/')) || []
    return tags
}

export const gitstrip = async (project) => {
    const projectUrl = project.http_url_to_repo
    const projectDir = path.join('.', '/clones/projects/', project.name)
    const remoteTags = await getRemoteTags(project.name, projectUrl)
    console.log('============================================================')
    console.log(project.name)
    console.log('remote-tags', remoteTags.length, 'summary-tags', project.tags.length)
    mkdirp(projectDir)

    await clone(projectUrl, projectDir)
    if (remoteTags.length >= project.tags.length) {
        console.log('gitstrap', 'all tags exists remotely, skipping tag pushes')
    } else {
        for (let tag of project.tags) {
            try {
                const tagDir = path.join('./clones/tags/', project.name, tag.name)
                console.log('------------------------------------------------------------')
                console.log('gitstrip', 'tagdir', tagDir)
                mkdirp(tagDir)
                rm(tagDir)
                await cp(projectDir, tagDir)
                await checkout(tagDir, tag.name)
                await anonymizeAndPush(tagDir, projectUrl, tag)
                rm(tagDir)
            }
            catch (err) {
                console.log('ERROR', e)
            }
        }
    }

    console.log('------------------------------------------------------------')

    await anonymizeAndUpdateBranch(projectDir, projectUrl, 'master')
    console.log("")
    rm(projectDir)
}

export default gitstrip