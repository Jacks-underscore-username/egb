# Encrypted Github Backups (EGB)

## EGB is a system to allow the free storing of password protected files on github without the need for a private repo.

(*note: this guide assumes you have node already installed and have your device authenticated with github through gh*)

### Setup
 1. Download the ```script.cjs``` file from this repo and put it in the folder you that will be backed up.
 1. Run ```node script.cjs``` in a terminal opened to said folder. (note: the first two steps can be skipped by running one of these os specific commands in a terminal opened to the folder:)
 * Windows: ```Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Jacks-underscore-username/egb/main/script.cjs" -OutFile "script.cjs" && node script.cjs```
 * Linux: ```curl -O https://raw.githubusercontent.com/Jacks-underscore-username/egb/main/script.cjs && chmod +x script.cjs && node script.cjs```
 1. Edit the ```user```, ```repo```, and ```passphrase``` values in the auto generated ```config.json``` file.

Thats it! You are now ready to use the EGB system. 

### Usage
Just run ```egb save``` or ```egb load``` in any terminal.

***Created by [Jacks-underscore-username](https://github.com/Jacks-underscore-username)***