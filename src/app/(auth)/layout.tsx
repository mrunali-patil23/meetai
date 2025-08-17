interface Props {
    children: React.ReactNode;
};

const Layout = ({ children }: Props) => {
    return (
        <div data-testid="auth-layout-outer" className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
            <div data-testid="auth-layout-inner" className="w-full max-w-sm md:max-w-3xl">
                {children}
            </div>
        </div>
    );
};

export default Layout;