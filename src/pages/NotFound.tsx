import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { MessageCircle, Twitter } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center pointer-events-auto">
      <div className="text-center backdrop-blur-sm bg-card/10 rounded-2xl p-12 shadow-2xl border border-white/10">
        <h1 className="mb-4 text-6xl font-bold text-white drop-shadow-lg">404</h1>
        <p className="mb-8 text-xl text-white/70 drop-shadow-md">Oops! Page not found</p>
        <Link 
          to="/" 
          className="inline-block px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg border border-white/20 hover:bg-white/20 transition-all"
        >
          Return to Home
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 pointer-events-auto absolute bottom-0 left-0 right-0">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-white/70">Solimare RWA Adventures • Powered by Solana</p>
            <div className="flex gap-3">
              <a 
                href="https://t.me/sailwithsolimare" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20"
                aria-label="Telegram"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <a 
                href="https://x.com/Solimare2025" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all border border-white/20"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NotFound;
