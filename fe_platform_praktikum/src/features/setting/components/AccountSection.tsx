export default function AccountSection() {
  return (
    <div className="bg-white rounded-2xl shadow p-8 space-y-8">
      
      {/* Ubah Email */}
      <div>
        <h3 className="font-semibold mb-4">Ubah Email</h3>
        <input
          type="email"
          placeholder="Email baru"
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition active:bg-blue-100 active:text-blue-600">
          Simpan Email
        </button>
      </div>

      {/* Ubah Password */}
      <div>
        <h3 className="font-semibold mb-4">Ubah Password</h3>
        <input
          type="password"
          placeholder="Password baru"
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />
        <input
          type="password"
          placeholder="Konfirmasi password"
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition active:bg-blue-100 active:text-blue-600">
          Simpan Password
        </button>
      </div>
    </div>
  );
}
