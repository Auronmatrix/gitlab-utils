import fs from 'fs'
import copy from 'recursive-copy'


export const mkdirp = (path) => fs.mkdirSync(path, { recursive: true })

export const snooze = ms => new Promise(resolve => setTimeout(resolve, ms))

export const writeSummary = async (summaryPath, summary) => {
    fs.writeFileSync(summaryPath, JSON.stringify(summary))
}

export const readSummary = async (summaryPath) => {
    if (!fs.existsSync(summaryPath)) {
        return null
    }
    const summaryString = fs.readFileSync(summaryPath)
    return JSON.parse(summaryString)
}

export const shouldExclude = (excludeList, project) => {
  return excludeList.indexOf(project) > -1
}

export const cp = async (src, dest) => {
    await copy(src, dest, { dot: true })
}

export const rm = (src) => {
    if (fs.existsSync(src)) {
        fs.rmdirSync(src, { recursive: true })
    }
    else {
        console.log('rm', 'noexist')
    }
}