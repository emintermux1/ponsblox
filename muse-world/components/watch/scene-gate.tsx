"use client";

import { Component, type ReactNode } from "react";

type GateProps = {
  children: ReactNode;
};

type GateState = {
  failed: boolean;
};

export class SceneGate extends Component<GateProps, GateState> {
  state: GateState = { failed: false };

  static getDerivedStateFromError(): GateState {
    return { failed: true };
  }

  render(): ReactNode {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}
