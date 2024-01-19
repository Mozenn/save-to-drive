# Save To Drive

Save To Drive is a small CLI application to upload files and folders to google drive.

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

### Saves file

Saves files are in JSON format following this structure:

- path (str): Path of the folder to save
- options (array)
  - mimeType (str): mimeType of the element to save
  - deleteExisting (bool): delete first encountered file or folder with the same name as the element to save
  - baseFolderId (str): Id of the folder where the element to save will be uploaded
