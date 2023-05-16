# ChatMicroBlog - a chat / web story connector

ChatMicroBlog is a two part system that connects your private slack to a wix website - this was originally set up for the Fairfield County Makers Guild to give members an easy way to share their project updates by sending a short slack story. The format is a little picky - the first line becomes the story title, the remaining lines become the story text. The story (currently) requires an image attached to it, but only supports images of the configured MIME types.

A set of approvers needs to be configured - these are users that choose when a story is safe to export. The list can be configured in your config.json file (the slack ID is required, the value / name is just for your reference). You can also change which emojis signify approval here, and need to configure where your wix rest endpoint is located.

Note that this takes 30-60 minutes to set up, depending on your comfort level with wix, node, slack bots, and JSON Web Keys. These instructions are loose recommendations only, be sure to audit any endpoint security to match your best practices.

## Secrets Manager
Under the dashboard / "Developer Tools" / "Secrets Manager", we need to add two keys in the default configuration:
1. CMB_EPSK - ChatMicroBlog JWK REST Embedded Pre Shared Key. This should be embedded in the JWK authorization text. You can choose any secret you want as long as it matches between the slack bot and the wix REST endpoint.
2. CMB_JWK - ChatMicroBlog JSON Web Key for decoding rest requests. This unwraps the Authorization request. You can generate this keypair with the genkeys.js file with node locally, or however you manage asymmetric key pairs. Note that the old version of jose supported by wix doesn't support all of the modern modes and needs the private key stored in JSON Web Key format.

## Adding a Media subdirectory:
In the dashboard, select "Search" and type "media manager" ("Upload and manage your files"). Note that if you share your root media directory, the images will also be available through the path, which may be a security risk. Click "Create New Folder" and by default it should be named "cmbUploads".

## Adding the Collection:
1. Under the site editor / Content Manager, click "Create Collection". By default this is named "chatMicroBlog". Select "Multiple Items" and click "Create".
2. By default, we disable Wix based role authorization, as we're using the JOSE JWK and Slack SSO identity and auth models. In the chatMicroBlog collection, click "More Actions" / "Permissions & Privacy", set the content type to "Custom", then set the permissions as follows:
  * "Anyone" Can view content
  * "Anyone" Can add content
  * "Admin" Can delete content
  * "Anyone" Can update content.
When this is all set, click "Save".
3. The collection manager schema management is a little coarse, so we're mostly using loose text fields. To edit the collection schema, click "Manage Fields" and add the following fields:
  * title should already exist and be a text field
  * image of type Image
  * imagealt of type Text
  * story of type Text
  * authorid of type Text
  * authorname of type Text

## Adding Modules
The Wix NPM registry has some very dated modules, including the version of JOSE available. If you're not already using Dev Mode, enable Dev Mode by clicking the "Dev Mode" menu and selecting "Turn on Dev Mode". You can disable it after this setup as desired. On the left side menu, choose "Code Packages" (looks like a folded closed box), then click the plus next to the npm section / "Install package from npm". Search for jose (currently version 3.5.0), and click install / confirm. It should now appear back in the dev mode code packages menu.

## Adding the code
You'll need Dev Mode enabled for this as well (see "Adding Modules"). On the left menu, select "Public & Backend" (not the default "page code" option). Under the "Backend" section, click the plus, and "New .js File". Then rename this file to "http-functions.js". Note that this name is special - wix will ignore the REST server code if you name it anything else. Click http-functions.js to see the code window at the bottom of the screen. Paste the code from github in here; apologies, I didn't see an easier way to import this for now.

## Add the Collection to a webpage
[this section needs to be fleshed out]
In your website page where you want the micro blogs to appear, add a List / Repeater element and connect it to the collection set up above (add a dataset, the default should be "chatMicroBlog"). Then add a title element and connect it to the Title dataset field, an image and connect it to the image field (wiring up the imagealt as the alt text), etc. Style to taste.

## Slack Bot Setup
TBD - it's mainly just a slack bolt bot that watches for specific emoji from specific users authorizing a chat message to be sent to wix to become a micro blog. It needs to be able to read and write messages to read chat stories and update with status messages, and it needs the user data to retrieve the user name. Specific scopes to be added here.

You'll need the following environment variables filled:
CMB_SLACK_TOKEN
CMB_SLACK_SIGNINGSECRET
CMB_SLACK_APPTOKEN
CMB_WEBAPI_PUB
CMB_WEBAPI_EPSK
