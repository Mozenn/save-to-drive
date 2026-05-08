# Save To Drive

![workflow](https://github.com/Mozenn/save-to-drive/actions/workflows/publish.yml/badge.svg)
[![npm version](https://badge.fury.io/js/save-to-drive.svg)](https://badge.fury.io/js/save-to-drive)

Save To Drive is a CLI application to upload files and folders to google drive.

## Getting Started

1. Set up your google cloud project and get your client credentials following [How-to-get-the-client-credentials](#How-to-get-the-client-credentials)

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

### How to get the client credentials

You first need to create a google cloud project following https://developers.google.com/workspace/guides/create-project.
Then, get the client id and client secret from your newly created project.

Finaly, set the following environment variables:
* STD_CLIENT_ID: the client id
* STD_CLIENT_SECRET: the client secret
* STD_REDIRECT_URI (optional, default to http://localhost:3000/callback): the redirect uri used to retrieve the token once you are authenticated. A local server is created using this hostname and port to receive the callback request from the google auth flow.

### Saves file

Saves files are in JSON format following this structure:

- path (str): Path of the element to save
- options (array)
  - mimeType (str): mimeType of the element to save
  - deleteExisting (bool): delete first encountered file or folder with the same name as the element to save
  - baseFolderId (str): Id of the folder where the element to save will be uploaded
  - ignore (array): List of files and folders to ignore within the element to save

Checkout the example saves.json configuration file in /data for more details
