// 공유 페이지(파일 하나짜리) 빌드에서 next/navigation 대신 쓰는 메모리 라우터.
// 페이지 주소를 바꾸지 않고 화면만 전환하며, 현재 화면은 sessionStorage에 기억한다.
import { useSyncExternalStore } from "react";

const KEY = "dbeottae:path";
const subs = new Set<() => void>();

let path = (() => {
  try {
    return sessionStorage.getItem(KEY) || "/login";
  } catch {
    return "/login";
  }
})();

let params: Record<string, string> = {};

export function navigate(to: string) {
  path = to.split("?")[0] || "/login";
  try {
    sessionStorage.setItem(KEY, path);
  } catch {}
  subs.forEach((f) => f());
  window.scrollTo(0, 0);
}

export function setParams(p: Record<string, string>) {
  params = p;
}

export function usePathname() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => path,
    () => path,
  );
}

export function useParams<T extends Record<string, string>>() {
  return params as T;
}

export function useRouter() {
  return {
    push: navigate,
    replace: navigate,
    back: () => navigate("/login"),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function redirect(to: string): never {
  navigate(to);
  throw new Error("redirect");
}
