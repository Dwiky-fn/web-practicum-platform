interface Props {
  avatarUrl?: string;
  fullname: string;
  size?: number;
}

const getInitials = (name: string) => {
  return name
    .trim()
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
};

const getColorFromName = (name: string) => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-pink-500',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function Avatar({ avatarUrl, fullname, size = 48 }: Props) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullname}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`rounded-full flex items-center justify-center text-white font-semibold ${getColorFromName(fullname)}`}
    >
      {getInitials(fullname)}
    </div>
  );
}