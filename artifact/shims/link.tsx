// 공유 페이지 빌드에서 next/link 대신 쓰는 링크: 클릭하면 메모리 라우터로 화면만 바꾼다.
import { navigate } from "./navigation";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

export default function Link({ href, onClick, children, ...rest }: Props) {
  return (
    <a
      {...rest}
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}
