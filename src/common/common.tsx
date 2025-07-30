import * as React from "react";
import * as ReactDOM from "react-dom";

export function showRootComponent(component: React.ReactElement<any>, containerId: string) {
  ReactDOM.render(component, document.getElementById(containerId));
}

