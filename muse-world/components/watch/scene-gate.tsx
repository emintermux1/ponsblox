"use client";

import { Component, type ReactNode } from "react";

type GateProps = {
  children: ReactNode;
  fallback?: ReactNode;
  onFail?: () => void;
};

type GateState = {
  failed: boolean;
};

export class SceneGate extends Component<GateProps, GateState> {
  state: GateState = { failed: false };

  static getDerivedStateFromError(): GateState {
    return { failed: true };
  }

  componentDidCatch(): void {
    this.props.onFail?.();
  }

  render(): ReactNode {
    if (this.state.failed) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
