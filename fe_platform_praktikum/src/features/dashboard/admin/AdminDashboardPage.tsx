import Navbar from "../../../components/navbar/Navbar";

export default function AdminDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-10 py-8">
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard Admin
        </h1>

        <p className="mt-4 text-gray-600">
          Selamat datang di halaman dashboard admin.
        </p>
      </main>
    </div>
  );
}
