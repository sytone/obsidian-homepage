import { App, Notice, Plugin, PluginSettingTab, Setting, addIcon } from "obsidian";

interface HomepageSettings {
	defaultNote: string,
	workspaceEnabled: boolean,
	hasRibbonIcon: boolean
}

const DEFAULT: HomepageSettings = {
	defaultNote: "Home",
	workspaceEnabled: false,
	hasRibbonIcon: true
}

const ICON: string = `<svg fill="currentColor" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2"><path d="M12.484 3.1 9.106.075.276 7.769h2.112v10.253h4.189v.006h4.827v-.006h3.954V7.769h2.339l-2.339-2.095v-4.48l-2.874.04V3.1zM7.577 17.028h2.9v-3.439h-2.9v3.439zm6.781-9.259h-3.671v3.24H7.313v-3.24H3.388v9.253h3.189v-4.433h4.9v4.433h2.881V7.769zm-4.671.222v2.018H8.313V7.991h1.374zM2.946 6.769h12.136l-2.598-2.326-3.387-3.034-6.151 5.36zm11.412-1.99-.874-.783V2.22l.874-.012v2.571z"/></svg>`

export default class Homepage extends Plugin {
	settings: HomepageSettings;
	workspacePlugin: any;

	async onload() {
		this.workspacePlugin = (<any> this.app)?.internalPlugins?.plugins?.workspaces;
		
		await this.loadSettings();
		this.addSettingTab(new HomepageSettingTab(this.app, this));
		
		this.addCommand({
			id: "open-homepage",
			name: "Open homepage",
			callback: this.openHomepage,
		});	
		
		if(this.settings.hasRibbonIcon) {
			addIcon("homepage", ICON);
			this.addRibbonIcon("homepage", "Open homepage", this.openHomepage);
		}
			
		if(this.app.workspace.activeLeaf == null) {
			//only do on startup, not plugin activation
			this.app.workspace.onLayoutReady(this.openHomepage);
		}
	}
	
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	openHomepage = async (): Promise<void> => {
		if(this.workspacesMode()) {
			if(!(this.settings.defaultNote in this.workspacePlugin?.instance.workspaces)) {
				new Notice(`Cannot find the workspace "${this.settings.defaultNote}" to use as the homepage.`);
				return;
			}
			
			this.workspacePlugin.instance.loadWorkspace(this.settings.defaultNote);
		}
		else {
			await this.app.workspace.openLinkText(this.settings.defaultNote, "", false, { active: true });
		}
	};
	
	workspacesMode(): boolean {
		return this.workspacePlugin?.enabled && this.settings.workspaceEnabled;
	}
}

class HomepageSettingTab extends PluginSettingTab {
	plugin: Homepage;
	settings: HomepageSettings;

	constructor(app: App, plugin: Homepage) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = plugin.settings;
	}

	display(): void {
		let {containerEl} = this;
		containerEl.empty();
		
		new Setting(containerEl)
			.setName("Open on startup")
			.setDesc(
				this.plugin.workspacesMode() ?
				"The name of the workspace to open on startup." :
				"The name of the note to open on startup. If it doesn't exist, a new note will be created."
			)
			.addText(text => text
				.setPlaceholder("Home")
				.setValue(DEFAULT.defaultNote == this.settings.defaultNote ? "" : this.settings.defaultNote)
				.onChange(async (value) => {
					this.settings.defaultNote = value || DEFAULT.defaultNote;
					await this.plugin.saveSettings();
				}
			)
		);
		
		if(this.plugin.workspacePlugin?.enabled) {
			new Setting(containerEl)
				.setName("Use workspaces")
				.setDesc("Open a workspace, instead of a note, as the homepage.")
				.addToggle(toggle => toggle
					.setValue(this.settings.workspaceEnabled)
					.onChange(async value => {
						this.settings.workspaceEnabled = value;
						await this.plugin.saveSettings();
						this.display(); //update open on startup's text
					}
				)
			);
		}
		
		let ribbonSetting = new Setting(containerEl)
			.setName("Display ribbon icon")
			.setDesc("Show a little house on the ribbon, allowing you to quickly access the homepage.")
			.addToggle(toggle => toggle
				.setValue(this.settings.hasRibbonIcon)
				.onChange(async value => {
					this.settings.hasRibbonIcon = value;
					await this.plugin.saveSettings();
				}
			)
		);
		ribbonSetting.descEl.createDiv({ text: "Takes effect on startup.", attr: {class: "mod-warning"}});
	}
}
