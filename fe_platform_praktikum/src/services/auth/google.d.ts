export {}

type GoogleCredentialResponse = {
  credential?: string
  select_by?: string
}

type GoogleIdConfiguration = {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
}

type GoogleButtonConfig = {
  theme?: "outline" | "filled_blue" | "filled_black"
  size?: "large" | "medium" | "small"
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  shape?: "rectangular" | "pill" | "circle" | "square"
  width?: number | string
  logo_alignment?: "left" | "center"
}

type GoogleAccounts = {
  id: {
    initialize: (config: GoogleIdConfiguration) => void
    renderButton: (parent: HTMLElement, options: GoogleButtonConfig) => void
    prompt: () => void
    disableAutoSelect: () => void
  }
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts
    }
  }
}