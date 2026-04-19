"use client";

export default function RewardsPage() {
  return (
    <main className="min-h-dvh bg-brand-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">My Rewards</h1>
        <p className="text-sm opacity-70 mb-6">
          Rewards tracking coming soon.
        </p>

        <div className="rounded-xl bg-gray-800 p-6 space-y-3">
          <div>
            <div className="text-sm opacity-70">Visits</div>
            <div className="text-2xl font-semibold">0</div>
          </div>

          <div>
            <div className="text-sm opacity-70">Points</div>
            <div className="text-2xl font-semibold">0</div>
          </div>

          <div>
            <div className="text-sm opacity-70">Next Reward</div>
            <div className="text-lg font-medium">Coming soon</div>
          </div>
        </div>
      </div>
    </main>
  );
}
