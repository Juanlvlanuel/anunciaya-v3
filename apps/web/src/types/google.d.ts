// Declaración de tipo para Google Identity Services
// Compartida entre PaginaLanding y PaginaRegistro
declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: Record<string, unknown>) => void;
                    prompt: (callback?: (notification: Record<string, unknown>) => void) => void;
                    renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
                    disableAutoSelect: () => void;
                };
            };
        };
    }
}

export {};
