import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}

import grc_data from './grc.json';

export class GlossingModal extends Modal {
	constructor(app: App, word) {
		super(app);
		let data = JSON.parse(word.getAttribute('data-word'));
		this.setTitle(data.form);
		this.contentEl.createEl('p', {text: data.lemma + ' ' + data.upos});
		let ul = this.contentEl.createEl('ul')
		for (let key of Object.keys(data.feats)) {
			ul.createEl('li', {text: key + ' ' + data.feats[key]});
		}
	}
}

export default class PassagePlugin extends Plugin {
	word_hover(event) {
		new GlossingModal(this.app, event.target).open();
	}
  async onload() {
      this.registerMarkdownCodeBlockProcessor('passage', (source, el, ctx) => {
		  const pat = /(\w+) (\d+):(\d+)(?:-(\d+))?/g;
		  let m = pat.exec(source);
		  let book = m[1];
		  let chapter = parseInt(m[2]);
		  let v1 = parseInt(m[3]);
		  let v2 = (m[4] === undefined ? v1 : parseInt(m[4]));
		  const seq = grc_data.order[book][chapter-1];
		  for (let v = v1; v <= v2 && v < seq.length; v++) {
			  const sid = seq[v];
			  if (!sid) continue;
			  const line = el.createEl('p');
			  grc_data.sentences[sid].forEach((word) => {
				  let span = line.createEl('span', {
					  text: word.form,
					  title: word.lemma,
					  cls: 'grc-word',
				  });
				  span.setAttribute('data-word', JSON.stringify(word));
				  span.addEventListener('click', (e) => this.word_hover(e));
				  if (word.misc.SpaceAfter != 'No') {
					  line.createEl('span', {text: ' '});
				  }
			  });
		  }
	  });
  }
}
