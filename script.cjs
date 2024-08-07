#!/usr/bin/env node

const fs = require('fs')
const { execSync, exec } = require('child_process')
const path = require('path')
const crypto = require('crypto')
const { promisify } = require('util')
const readline = require('readline')
const os = require('os')
    ;
(async () => {
    if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
        if (fs.existsSync(__dirname, 'config.json')) {
            const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')))
            if (!['user', 'repo', 'tempFolder', 'ignoredPaths', 'passphrase'].every(key => config[key] !== undefined))
                fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify({ user: 'Repo author', repo: 'Storage repo', tempFolder: 'backup_temp', ignoredPaths: ['node_modules'], passphrase: 'SuperSecretPassphrase' }, undefined, 4))
        }
        else
            fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify({ user: 'Repo author', repo: 'Storage repo', tempFolder: 'backup_temp', ignoredPaths: ['node_modules'], passphrase: 'SuperSecretPassphrase' }, undefined, 4))
        if (os.platform() === 'linux' || os.platform() === 'android')
            execSync('chmod +x script.cjs')
        execSync('npm init -y')
        const obj = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')))
        obj.author = 'Jacks-underscore-username'
        obj.bin = { egb: 'script.cjs' }
        obj.scripts.start = 'node script.cjs'
        obj.name = 'EGB'
        fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify(obj, undefined, 4), 'utf8')
        execSync('npm link')
        fs.writeFileSync(path.join(__dirname, 'README.md'), [
            '# Encrypted Github Backups (EGB)',
            '',
            '## EGB is a system to allow the free storing of password protected files on github without the need for a private repo.',
            '',
            '(*note: this guide assumes you have node already installed and have your device authenticated with github through gh*)',
            '',
            '### Setup',
            ' 1. Download the ```script.cjs``` file from this repo and put it in the folder you that will be backed up.',
            ' 1. Run ```node script.cjs``` in a terminal opened to said folder. (note: the first two steps can be skipped by running one of these os specific commands in a terminal opened to the folder:)',
            ' * Windows: ```Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Jacks-underscore-username/egb/main/script.cjs" -OutFile "script.cjs" && node script.cjs```',
            ' * Linux: ```curl -O https://raw.githubusercontent.com/Jacks-underscore-username/egb/main/script.cjs && chmod +x script.cjs && node script.cjs```',
            ' 1. Edit the ```user```, ```repo```, and ```passphrase``` values in the auto generated ```config.json``` file.',
            '',
            'Thats it! You are now ready to use the EGB system. ',
            '',
            '### Usage',
            'Just run ```egb save``` or ```egb load``` in any terminal.',
            '',
            '***Created by [Jacks-underscore-username](https://github.com/Jacks-underscore-username), read more at [my blog.](https://jacks-project-hub.vercel.app/posts/Github%20backup/)***'].join('\n'), 'utf8')
        console.log('Config file generated, finish setup by filling it out, then run egb save / egb load to use.')
        process.exit(0)
    }

    const formatPath = (inputPath, slash = '/') => inputPath.replace(/\/+|\\+/g, slash)
    const localPath = (() => os.platform() === 'win32' ? (inputPath, slash = '\\') => formatPath(inputPath, slash) : (inputPath, slash = '/') => formatPath(inputPath, slash))();

    const { user, repo, tempFolder, ignoredPaths, passphrase } = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json')))

    const mode = process.argv[2]
    if (mode !== 'save' && mode !== 'load') {
        console.error('Invalid command, valid commands are "save" or "load"')
        fs.rmSync(path.join(__dirname, tempFolder), { recursive: true, force: true })
        process.exit(1)
    }

    const algorithm = 'aes-256-cbc'
    const salt = crypto.randomBytes(16).toString('binary')
    const key = crypto.scryptSync(passphrase, salt, 32)

    const extraRepoFiles = ['script.cjs', 'README.md']
    const selfFiles = ['index.json', 'config.json']

    if (!fs.existsSync(path.join(__dirname, tempFolder)))
        fs.mkdirSync(path.join(__dirname, tempFolder))

    process.chdir(__dirname)

    const prettySize = bytes =>
        bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toPrecision(4)}G` :
            bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toPrecision(4)}m` :
                bytes >= 1024 ? `${(bytes / 1024).toPrecision(4)}k` : `${bytes}b`

    const getRandomFileName = () => crypto.randomBytes(16).toString('hex')

    const encryptFile = (inputPath, outputPath) => new Promise(resolve => {
        inputPath = localPath(inputPath)
        outputPath = localPath(outputPath)
        const iv = crypto.randomBytes(16)
        const input = fs.createReadStream(path.join(__dirname, inputPath))
        const output = fs.createWriteStream(path.join(__dirname, outputPath))

        output.write(`${Buffer.from(salt, 'binary').toString('base64')}\n`)

        output.write(`${iv.toString('base64')}\n`)

        const cipher = crypto.createCipheriv(algorithm, key, iv)
        input.pipe(cipher).pipe(output)

        output.on('finish', () => {
            input.close()
            resolve()
        })
    })

    const decryptFile = (inputPath, outputPath) => new Promise(resolve => {
        inputPath = localPath(inputPath)
        outputPath = localPath(outputPath)
        const input = fs.createReadStream(path.join(__dirname, inputPath))
        const rl = readline.createInterface({
            input: input,
            crlfDelay: Infinity
        })

        let key, iv, offset
        let lineIndex = 0

        const startDecryption = () => {
            if (!fs.existsSync(localPath(path.dirname(path.join(__dirname, outputPath)))))
                fs.mkdirSync(localPath(path.dirname(path.join(__dirname, outputPath))), { recursive: true })
            const output = fs.createWriteStream(localPath(path.join(__dirname, outputPath)))
            const decipherStream = crypto.createDecipheriv(algorithm, key, iv)
            const encryptedStream = fs.createReadStream(path.join(__dirname, inputPath), { start: offset })
            encryptedStream.pipe(decipherStream).pipe(output)
            output.on('finish', () => {
                input.close()
                resolve()
            })
            rl.close()
        }

        rl.on('line', line => {
            if (lineIndex === 0) {
                offset = Buffer.byteLength(Buffer.from(line)) + 1
                key = crypto.scryptSync(passphrase, Buffer.from(line, 'base64').toString('binary'), 32)
            }
            else if (lineIndex === 1) {
                offset += Buffer.byteLength(Buffer.from(line)) + 1
                iv = Buffer.from(line, 'base64')
                startDecryption()
            }
            lineIndex++
        })
    })

    //Ensure the repo exists and is up to date.
    try {
        try {
            let toldOfPinging
            const handle = setTimeout(() => {
                console.log('Pinging github...')
                toldOfPinging = true
            }, 1000)
            if (os.platform() === 'win32')
                execSync('ping -n 1 -l 1 github.com')
            else
                execSync('ping -c 1 -s 1 -w 5 github.com')
            clearTimeout(handle)
            if (toldOfPinging) console.log('Got response')
        }
        catch (e) {
            console.error('Cannot connect to github, check your internet connection or https://githubstatus.com')
            process.exit(1)
        }
        console.log('Checking for remote repo...')
        try {
            execSync(`gh repo view ${user}/${repo}`)
            console.log('Remote repo found')
        }
        catch (e) {
            console.log('No remote repo found, creating one now...')
            process.chdir(path.join(__dirname, tempFolder))
            execSync('git init', { stdio: 'inherit' })
            execSync('git branch -m master main', { stdio: 'inherit' })
            extraRepoFiles.forEach(filePath => fs.copyFileSync(path.join(__dirname, filePath), filePath))
            execSync('mkdir data', { stdio: 'inherit' })
            fs.writeFileSync(path.join(__dirname, tempFolder, 'data', 'INDEX.json'), JSON.stringify({ blobs: {}, files: [], currentFiles: [], commitMessage: '' }))
            await encryptFile(path.join(tempFolder, 'data', 'INDEX.json'), path.join(tempFolder, 'data', 'index'))
            execSync('git add *', { stdio: 'inherit' })
            execSync('git commit -m "First commit"', { stdio: 'inherit' })
            fs.rmSync(path.join(__dirname, tempFolder, 'data'), { recursive: true, force: true })
            extraRepoFiles.forEach(filePath => fs.rmSync(path.join(__dirname, tempFolder, filePath)))
            execSync(`gh repo create ${user}/${repo} --public`, { stdio: 'inherit' })
            execSync(`git remote add origin https://github.com/${user}/${repo.toLowerCase()}.git`, { stdio: 'inherit' })
            execSync('git push --mirror origin', { stdio: 'inherit' })
            process.chdir(__dirname)
        }
        if (fs.existsSync(path.join(__dirname, `${repo.toLowerCase()}.git`))) {
            console.log('Local repo found, fetching changes...')
            execSync(`git --git-dir=${repo.toLowerCase()}.git fetch origin main`, { stdio: 'inherit' })
            execSync(`git --git-dir=${repo.toLowerCase()}.git update-ref refs/heads/main refs/remotes/origin/main`, { stdio: 'inherit' })
        }
        else {
            console.log(`No local repo found, cloning from https://github.com/${user}/${repo}`)
            execSync(`git clone --bare https://github.com/${user}/${repo.toLowerCase()}.git`, { stdio: 'inherit' })
            execSync(`git --git-dir=${repo.toLowerCase()}.git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"`)
        }
        console.log('Repos synced')
    }
    catch (err) {
        console.error('Error setting up repo:', err)
        process.exit(1)
    }

    const index = await (async () => {
        execSync(`git --git-dir=${repo.toLowerCase()}.git show HEAD:data/index > "${path.join(__dirname, tempFolder, 'encryptedIndex')}"`, { stdio: 'inherit' })
        await decryptFile(path.join(tempFolder, 'encryptedIndex'), 'index.json')
        fs.rmSync(path.join(__dirname, tempFolder, 'encryptedIndex'))
        return JSON.parse(fs.readFileSync(path.join(__dirname, 'index.json'), 'utf8'))
    })()

    const hashFile = filePath => new Promise(resolve => {
        const hash = crypto.createHash('md5')
        const input = fs.createReadStream(path.join(__dirname, filePath))
        input.on('data', chunk => hash.update(chunk))
        input.on('end', () => resolve(hash.digest('hex')))
    })

    const { differences, localFiles } = await (async () => {
        console.log('Scanning for changes')

        //Store all the differences.
        const differences = []

        //Break the file reading into promises to speed up hashing.
        const filePromises = []

        //A list of all the files on the current system.
        const localFiles = []

        const repoPaths = index.currentFiles.map(entry => entry.path)

        //Recursively scans the folder and pushes any files to the filePromises array while checking for differences.
        const scanFolder = async folderPath => {
            await Promise.all((await promisify(fs.readdir)(path.join(__dirname, folderPath))).map(item => (async () => {
                const itemPath = path.join(folderPath, item)
                const stat = await promisify(fs.stat)(path.join(__dirname, itemPath))
                const formattedPath = formatPath(itemPath)
                if (stat.isDirectory()) {
                    if (!ignoredPaths.includes(item) && itemPath !== `${repo.toLowerCase()}.git` & itemPath !== tempFolder)
                        await scanFolder(itemPath)
                }
                else filePromises.push((async () => {
                    if (!selfFiles.includes(itemPath)) {
                        let hash
                        if (repoPaths.includes(formattedPath)) {
                            const entry = index.currentFiles.find(entry => entry.path === formattedPath)
                            if (Math.round(stat.mtimeMs) !== entry.mtime || stat.size !== entry.size) {
                                hash = await hashFile(itemPath)
                                if (hash === entry.hash)
                                    differences.push({ path: formattedPath, type: 'stat' })
                                else
                                    differences.push({ path: formattedPath, type: 'content' })
                            }
                            else
                                hash = entry.hash
                        }
                        else {
                            hash = await hashFile(itemPath)
                            differences.push({ path: formattedPath, type: 'local' })
                        }
                        localFiles.push({ path: formattedPath, mtime: Math.round(stat.mtimeMs), size: stat.size, hash })
                    }
                })())
            })()))
        }

        await scanFolder('')
        await Promise.all(filePromises)

        for (const itemPath of repoPaths)
            if (!localFiles.map(entry => entry.path).includes(itemPath))
                differences.push({ path: formatPath(itemPath), type: 'remote' })

        console.log(`Found ${differences.length} change${differences.length === 1 ? '' : 's'} and ${localFiles.length} local file${localFiles.length === 1 ? '' : 's'}`)
        return { differences, localFiles }
    })()

    const save = async () => {
        if (!differences.length) {
            console.log('No changes to save')
            return
        }
        process.chdir(path.join(__dirname, `${repo.toLowerCase()}.git`))
        index.currentFiles = []
        console.log('Creating file blobs')
        let sendingSize = 0
        let sendingFiles = 0
        let savedFilePaths = index.files.map(entry => entry.path)
        await Promise.all(localFiles.map(entry => (async () => {
            const filePath = entry.path
            if (index.blobs[entry.hash] === undefined) {
                const name = getRandomFileName()
                await encryptFile(filePath, path.join(tempFolder, name))
                const blob = (await promisify(exec)(`git hash-object -w "${path.join(__dirname, tempFolder, name)}"`)).stdout.toString().trim()
                console.log(`Created new blob for ${filePath}`)
                index.blobs[entry.hash] = blob
                await promisify(fs.rm)(path.join(__dirname, tempFolder, name))
                index.files = index.files.filter(entry => entry.path !== filePath)
                savedFilePaths = savedFilePaths.filter(entry => entry !== filePath)
                sendingSize += entry.size
                sendingFiles++
            }
            if (!savedFilePaths.includes(filePath)) {
                index.files.push({
                    path: filePath,
                    hash: entry.hash,
                    mtime: entry.mtime,
                    size: entry.size,
                })
            }
            index.currentFiles.push({
                path: filePath,
                hash: entry.hash,
                mtime: entry.mtime,
                size: entry.size,
                randomName: getRandomFileName()
            })
        })()))

        const savedFileMap = Object.fromEntries(index.files.map(entry => [entry.path, entry]))
        localFiles.forEach(entry => {
            if (savedFileMap[entry.path] === undefined) console.error(savedFileMap[entry.path], entry, savedFilePaths.includes(entry.path))
            savedFileMap[entry.path].mtime = entry.mtime
        })

        console.log('Assembling commit')

        fs.writeFileSync(path.join(__dirname, tempFolder, 'blobs'), index.currentFiles.map(entry => `100644 blob ${index.blobs[entry.hash]}\t${entry.randomName}\n`).join(''), 'utf8')

        const commitMessage = (() => {
            let message = ''
            const differenceTypes = ['local', 'remote', 'content', 'stat']
            const differenceMessages = { local: 'added', remote: 'removed', content: 'modified', stat: 'mtime synced' }
            const multipleTypes = differences.filter((entry, index, arr) => arr.slice(0, index).filter(subEntry => subEntry.type === entry.type).length === 0).length > 1
            if (multipleTypes) {
                message = `${differences.length} total changes:`
                for (const type of differenceTypes) {
                    const count = differences.filter(entry => entry.type === type).length
                    if (count)
                        message += `\n * ${count} file${count === 1 ? '' : 's'} ${differenceMessages[type]}`
                }
            }
            for (const type of differenceTypes) {
                const subDifferences = differences.filter(entry => entry.type === type)
                const count = subDifferences.length
                if (count) {
                    message += `${message.length ? '\n\n' : ''}${count} file${count === 1 ? '' : 's'} ${differenceMessages[type]}:`
                    subDifferences.forEach(entry => message += `\n * ${entry.path}`)
                }
            }
            return message
        })()

        index.commitMessage = commitMessage

        fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(index), 'utf8')
        await encryptFile('index.json', path.join(tempFolder, 'index'), true)
        const indexBlob = execSync(`git hash-object -w "${path.join(__dirname, tempFolder, 'index')}"`).toString().trim()
        fs.rmSync(path.join(__dirname, tempFolder, 'index'))

        fs.appendFileSync(path.join(__dirname, tempFolder, 'blobs'), `100644 blob ${indexBlob}\tindex`)

        const dataTreeHash = execSync(`git mktree < "${path.join(__dirname, tempFolder, 'blobs')}"`).toString().trim()
        fs.rmSync(path.join(__dirname, tempFolder, 'blobs'))

        const extraRepoBlobs = extraRepoFiles.map(filePath => ({ hash: execSync(`git hash-object -w "${path.join(__dirname, filePath)}"`).toString().trim(), path: filePath }))

        fs.writeFileSync(path.join(__dirname, tempFolder, 'rootBlobs'), `040000 tree ${dataTreeHash}\tdata\n${extraRepoBlobs.map(entry => `100644 blob ${entry.hash}\t${entry.path}\n`).join('')}`, 'utf8')

        const rootTreeHash = execSync(`git mktree < "${path.join(__dirname, tempFolder, 'rootBlobs')}"`).toString().trim()
        fs.rmSync(path.join(__dirname, tempFolder, 'rootBlobs'))

        const latestCommitHash = fs.existsSync(path.join(__dirname, `${repo.toLowerCase()}.git`, 'refs/heads/main')) ?
            fs.readFileSync(path.join(__dirname, `${repo.toLowerCase()}.git`, 'refs/heads/main'), 'utf8').trim() :
            fs.readFileSync(path.join(__dirname, `${repo.toLowerCase()}.git`, 'packed-refs'), 'utf8').match(/([0-9a-f]{40}) refs\/heads\/main/)[1]

        const commitHash = execSync(`git commit-tree ${rootTreeHash} -p ${latestCommitHash} -m ${crypto.randomBytes(8).toString('hex')} `).toString().trim()

        execSync(`echo ${commitHash} > refs/heads/main`)

        if (sendingSize)
            console.log(`Sending commit with ${prettySize(sendingSize)} of new content (${sendingFiles} file${sendingFiles === 1 ? '' : 's'})`)
        else
            console.log('Sending commit')

        execSync('git push origin refs/heads/main:refs/heads/main', { stdio: 'inherit' })

        console.log('Commit pushed with message:')
        console.log(commitMessage)

        console.log('Done')
    }

    const load = async () => {
        await Promise.all(differences.map(async difference => {
            const entry = index.currentFiles.find(entry => entry.path === difference.path)
            if (difference.type === 'remote') {
                await promisify(exec)(`git --git-dir=${repo.toLowerCase()}.git show HEAD:data/${entry.randomName} > "${path.join(__dirname, tempFolder, entry.randomName)}"`)
                await decryptFile(path.join(tempFolder, entry.randomName), difference.path)
                await promisify(fs.rm)(path.join(__dirname, tempFolder, entry.randomName))
                await promisify(fs.utimes)(path.join(__dirname, difference.path), new Date(), new Date(entry.mtime))
                console.log(`CREATE ${difference.path}`)
            }
            else if (difference.type === 'local') {
                await promisify(fs.rm)(path.join(__dirname, difference.path))
                console.log(`DELETE ${difference.path}`)
            }
            else if (difference.type === 'content') {
                await promisify(fs.rm)(path.join(__dirname, difference.path))
                await promisify(exec)(`git --git-dir=${repo.toLowerCase()}.git show HEAD:data/${entry.randomName} > "${path.join(__dirname, tempFolder, entry.randomName)}"`)
                await decryptFile(path.join(tempFolder, entry.randomName), difference.path)
                await promisify(fs.rm)(path.join(__dirname, tempFolder, entry.randomName))
                await promisify(fs.utimes)(path.join(__dirname, difference.path), new Date(), new Date(entry.mtime))
                console.log(`SET ${difference.path}`)
            }
            else if (difference.type === 'stat') {
                await promisify(fs.utimes)(path.join(__dirname, difference.path), new Date(), new Date(entry.mtime))
                console.log(`SYNC ${difference.path}`)
            }
        }))

        const changeMessage = (() => {
            let message = ''
            const differenceTypes = ['local', 'remote', 'content', 'stat']
            const differenceMessages = { local: 'removed', remote: 'added', content: 'modified', stat: 'mtime synced' }
            const multipleTypes = differences.filter((entry, index, arr) => arr.slice(0, index).filter(subEntry => subEntry.type === entry.type).length === 0).length > 1
            if (multipleTypes) {
                message = `${differences.length} total changes:`
                for (const type of differenceTypes) {
                    const count = differences.filter(entry => entry.type === type).length
                    if (count)
                        message += `\n * ${count} file${count === 1 ? '' : 's'} ${differenceMessages[type]}`
                }
            }
            for (const type of differenceTypes) {
                const subDifferences = differences.filter(entry => entry.type === type)
                const count = subDifferences.length
                if (count) {
                    message += `${message.length ? '\n\n' : ''}${count} file${count === 1 ? '' : 's'} ${differenceMessages[type]}:`
                    subDifferences.forEach(entry => message += `\n * ${entry.path}`)
                }
            }
            return message
        })()

        console.log(changeMessage)

        console.log('Done')
    }

    if (mode === 'save')
        await save()
    else if (mode === 'load')
        await load()

    fs.rmSync(path.join(__dirname, tempFolder), { recursive: true, force: true })
})()