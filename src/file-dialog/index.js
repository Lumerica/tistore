/**
 * Component for working with file dialogs.
 * @module tistore/file-dialog
 */

import React from "react";
import createReactClass from "create-react-class";

export default createReactClass({
  componentDidMount() {
    if (this.props.saveAs) {
      this.refs.file.setAttribute("nwsaveas", this.props.saveAs);
    } else if (this.props.directory) {
      this.refs.file.setAttribute("nwdirectory", "nwdirectory");
    }
  },
  styles: {
    file: {
      display: "none",
    },
  },
  select() {
    this.refs.file.click();
    return new Promise((resolve/*, reject*/) => {
      this._resolveCb = resolve;
    });
  },
  handleFileChange() {
    const file = this.refs.file.files[0];
    this.refs.file.value = null;
    this._resolveCb(file);
    delete this._resolveCb;
  },
  render() {
    return (
      <input
        ref="file"
        type="file"
        style={this.styles.file}
        accept={this.props.accept}
        onChange={this.handleFileChange}
      />
    );
  },
});
