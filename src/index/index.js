/**
 * Entry point of the application.
 * @module tistore/index
 */

import fs from "fs";
import os from "os";
import React from "react";
import ReactDOM from "react-dom";
import "./package.json.ejs";
import "./index.html.ejs";
import "./icon.png";
import "./opensans-regular.woff2";
import "./opensans-bold.woff2";
import "./opensans-italic.woff2";
import Aria2c from "../aria2c";
import Toolbar from "../toolbar";
import Filelist from "../filelist";
import Statusbar from "../statusbar";
import FileDialog from "../file-dialog";

const Index = React.createClass({
  getInitialState() {
    // Very simple OrderedDict equiavalent.
    this.fileSet = (function() {
      let list = [];
      let hash = Object.create(null);
      return {
        /* View as list. */
        list: list,
        add(file) {
          if (!(file.url in hash)) {
            hash[file.url] = null;
            list.push(file);
          }
        },
        clear() {
          list.length = 0;
          hash = Object.create(null);
        },
      };
    })();
    return {
      aspawning: true,
      outDir: os.tmpdir(),
      files: this.fileSet.list,
    };
  },
  componentWillMount() {
    const list = process.env.TISTORE_DEBUG_LIST;
    if (list) {
      this.handleListLoad(list);
    }
  },
  componentDidMount() {
    let mainWindow = window.nw.Window.get();
    mainWindow.on("close", () => {
      if (confirm("Are you sure you want to exit?")) {
        mainWindow.close(true);
      }
    });
    mainWindow.menu = this.getMenu();
    this.spawnAria();
  },
  componentDidUpdate() {
    // NOTE(Kagami): Make sure this function is not skipped because of
    // `shouldComponentUpdate` of whatever.
    // NOTE(Kagami): It's not possible to disable submenu on Linux (see
    // <https://github.com/nwjs/nw.js/issues/2312>), so we block all its
    // subelements instead.
    // NOTE(Kagami): There were some issues with dynamic updates on
    // Windows, see: <https://github.com/nwjs/nw.js/issues/2519>.
    const isReady = !this.state.aspawning && !this.state.aerror;
    const hasLinks = !!this.state.files.length;
    this.addLinksItem.enabled = isReady;
    this.exportLinksItem.enabled = isReady && hasLinks;
    this.clearLinksItem.enabled = isReady && hasLinks;
  },
  getMenu() {
    this.addLinksItem = new window.nw.MenuItem({
      label: "Add from file",
      click: this.handleLinksAdd,
    });
    this.exportLinksItem = new window.nw.MenuItem({
      label: "Export to file",
      click: this.handleLinksExport,
    });
    this.clearLinksItem = new window.nw.MenuItem({
      label: "Clear list",
      click: this.handleLinksClear,
    });
    let linksMenu = new window.nw.Menu();
    linksMenu.append(this.addLinksItem);
    linksMenu.append(this.exportLinksItem);
    linksMenu.append(this.clearLinksItem);
    let linksItem = new window.nw.MenuItem({label: "Links"});
    linksItem.submenu = linksMenu;

    let helpMenu = new window.nw.Menu();
    helpMenu.append(new window.nw.MenuItem({
      label: "About",
    }));
    helpMenu.append(new window.nw.MenuItem({
      label: "Official site",
    }));
    let helpItem = new window.nw.MenuItem({label: "Help"});
    helpItem.submenu = helpMenu;

    let menu = new window.nw.Menu({type: "menubar"});
    menu.append(linksItem);
    menu.append(helpItem);
    return menu;
  },
  spawnAria() {
    const ariap = Aria2c.spawn();
    process.addListener("exit", () => {
      // Always stop spawned process on exit.
      // TODO(Kagami): Unfortunately nw doesn't fire this event on
      // "Reload app" thus leaving aria2 process untouched.
      try {
        ariap.kill();
      } catch(e) {
        /* skip */
      }
    });
    ariap.then(aria2c => {
      this.setState({aspawning: false});
      this.aria2c = aria2c;
    }, err => {
      this.setState({aspawning: false, aerror: err});
    });
  },
  styles: {
    main: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
    },
    toolbar: {
    },
    filelist: {
      flex: 1,
      overflowY: "scroll",
      border: "solid #a9a9a9",
      borderWidth: "1px 0",
    },
    statusbar: {
    },
  },
  handleLinksAdd() {
    this.refs.openFile.select().then(f => this.handleListLoad(f.path));
  },
  handleListLoad(fpath) {
    // FIXME: Handle read errors.
    const data = fs.readFileSync(fpath, {encoding: "utf-8"});
    data.trim().split(/\r?\n/).forEach(line => {
      line = line.trim();
      // Should be enough for now. Leaving to aria2 all remaining
      // validation.
      if (line.startsWith("http://") || line.startsWith("https://")) {
        this.fileSet.add({url: line});
      }
    });
    this.setState({files: this.fileSet.list});
  },
  handleLinksExport() {
    this.refs.saveFile.select().then(file => {
      const data = this.state.files.map(f => f.url).join(os.EOL);
      // FIXME: Handle write errors.
      fs.writeFileSync(file.path, data);
    });
  },
  handleLinksClear() {
    this.fileSet.clear();
    this.setState({files: this.fileSet.list});
  },
  handleSetDir() {
    this.refs.openDir.select().then(d => this.setState({outDir: d.path}));
  },
  render() {
    return (
      <div style={this.styles.main}>
        <div style={this.styles.toolbar}>
          <Toolbar
            files={this.state.files}
            aspawning={this.state.aspawning}
            aerror={this.state.aerror}
            onSetDir={this.handleSetDir}
          />
        </div>
        <div style={this.styles.filelist}>
          <Filelist files={this.state.files} />
        </div>
        <div style={this.styles.statusbar}>
          <Statusbar
            files={this.state.files}
            outDir={this.state.outDir}
            aspawning={this.state.aspawning}
            aerror={this.state.aerror}
          />
        </div>
        <FileDialog ref="openFile" accept=".txt" />
        <FileDialog ref="saveFile" accept=".txt" saveAs="links.txt" />
        <FileDialog ref="openDir" directory />
      </div>
    );
  },
});

ReactDOM.render(<Index/>, document.getElementById("tistore-index"));
