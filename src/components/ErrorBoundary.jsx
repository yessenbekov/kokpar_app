import { Component } from "react";
import { localT } from "../app/i18n.js";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary" role="alert">
          <strong>{localT("Что-то пошло не так", "Бірдеңе дұрыс болмады", "Something went wrong")}</strong>
          <span>{this.state.error?.message ?? localT("Неизвестная ошибка", "Белгісіз қате", "Unknown error")}</span>
          <button type="button" onClick={() => this.setState({ error: null })}>
            {localT("Попробовать снова", "Қайталап көру", "Try again")}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
