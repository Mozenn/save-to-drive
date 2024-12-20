# Save To Drive

![workflow](https://github.com/Mozenn/save-to-drive/actions/workflows/publish.yml/badge.svg)
[![npm version](https://badge.fury.io/js/save-to-drive.svg)](https://badge.fury.io/js/save-to-drive)

Save To Drive is a CLI application to upload files and folders to google drive.

## Getting Started

1. Set up your google cloud project and get your credentials.json file following [How-to-get-the-credentials.json-file](#How-to-get-the-credentials.json-file)

2. Install save-to-drive

```console
npm i -g save-to-drive
```

3. Create a JSON saves file following [Saves-file](#Saves-file) or by checking the example files in data/ folder

4. Learn about the available options

```console
save-to-drive -h
```

5. To start uploading an element using the saves file, run :

```console
save-to-drive -s absolute/path/to/saves -c absolute/path/to/credentials.json
```

## Tips

### How to get the credentials.json file

You first need to create a google cloud project following https://developers.google.com/workspace/guides/create-project.
Then, get your credentials.json file following https://developers.google.com/workspace/guides/create-credentials#oauth-client-id.
The default path to place your credentials file is in your home directory, in ./save-to-drive/credentials.json

### Saves file

Saves files are in JSON format following this structure:

- path (str): Path of the element to save
- options (array)
  - mimeType (str): mimeType of the element to save
  - deleteExisting (bool): delete first encountered file or folder with the same name as the element to save
  - baseFolderId (str): Id of the folder where the element to save will be uploaded
  - ignore (array): List of files and folders to ignore within the element to save

Checkout the example saves.json configuration file in /data for more details
