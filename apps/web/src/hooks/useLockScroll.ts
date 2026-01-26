import { useEffect, useRef } from 'react';

export function useLockScroll(isLocked: boolean) {
    const scrollYRef = useRef(0);

    useEffect(() => {
        if (!isLocked) return;

        scrollYRef.current = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollYRef.current}px`;
        document.body.style.width = '100%';

        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            window.scrollTo(0, scrollYRef.current);
        };
    }, [isLocked]);
}