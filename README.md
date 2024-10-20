# Encrypted Github Backups (EGB)

## EGB is a system to allow the free storing of password protected files on github without the need for a private repo.

(*note: this guide assumes you have node already installed and have your device authenticated with github through gh*)

### Setup
 1. Download the ```script.js``` file from this repo and put it in the folder you that will be backed up.
 1. Run ```node script``` in a terminal opened to said folder. (note: the first two steps can be skipped by running one of these os specific commands in a terminal opened to the folder:)

#### Shortcuts (run these commands to do the above steps automatically):
 * Windows: ```Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Jacks-underscore-username/egb/main/script.js" -OutFile "script.js"; node script```
 * Linux or Android: ```curl -O https://raw.githubusercontent.com/Jacks-underscore-username/egb/main/script.js && chmod +x script.js && node script```
 1. Edit the ```user```, ```repo```, and ```passphrase``` values in the auto generated ```config.json``` file.

Thats it! You are now ready to use the EGB system. 

### Usage
Just run ```egb save``` or ```egb load``` in any terminal after you reload.

***Created by [Jacks-underscore-username](https://github.com/Jacks-underscore-username), read more at [my blog.](https://jacks-project-hub.vercel.app/posts/Github%20backup/)***