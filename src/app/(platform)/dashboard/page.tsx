export default function Page() {
  const items = Array.from({ length: 100 }, (_, i) => `This is item #${i + 1}`);

  return (
    <div className="flex flex-col overflow-auto h-[calc(100vh-64px)] gap-2 p-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-md bg-gray-100 px-4 py-3 shadow-sm text-sm text-gray-800">
          {item}
        </div>
      ))}
    </div>
  );
}
