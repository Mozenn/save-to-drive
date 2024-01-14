# Save To Drive

Save To Drive is a small CLI application to upload files and folders to google drive.

## Getting Started

1. install save-to-drive

```console
npm i -g save-to-drive
```

2. create a JSON saves file following [Saves-file](#Saves-file) or by checking the example files in data/ folder

3. Learn about the available options

```console
save-to-drive -h
```

4. To start uploading an element using the saves file, run :

```console
save-to-drive -c absolute/path/to/saves
```

## Tips

### Saves file

Saves files are in JSON format following this structure:

- path (str): Path of the folder to save
- options (array)
  - mimeType (str): mimeType of the element to save
  - deleteExisting (bool): delete first encountered file or folder with the same name as the element to save
  - baseFolderId (str): Id of the folder where the element to save will be uploaded
