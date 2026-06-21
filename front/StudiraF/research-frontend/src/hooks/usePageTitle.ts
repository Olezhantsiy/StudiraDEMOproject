import { useEffect } from "react";

const APP_NAME = "Studira";

export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
