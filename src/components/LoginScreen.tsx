import { useState, useEffect } from "react";

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 인증 상태 확인
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (isAuthenticated === "true") {
      onLogin();
    } else {
      setIsLoading(false);
    }
  }, [onLogin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === "0705") {
      // 인증 성공
      localStorage.setItem("isAuthenticated", "true");
      onLogin();
    } else {
      setError("비밀번호가 올바르지 않습니다");
      setPassword("");
      setTimeout(() => setError(""), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            TASK_SHARED
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            비밀번호를 입력하여 접속하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-600 rounded-lg 
                bg-white dark:bg-zinc-800 text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                transition-colors duration-200"
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
              text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 
              text-white font-medium rounded-lg 
              focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
              transition-colors duration-200"
          >
            접속
          </button>
        </form>


      </div>
    </div>
  );
}
