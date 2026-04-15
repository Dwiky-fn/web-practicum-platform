interface Props {
  output: string;
}

export default function OutputPanel({ output }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Output:
      </h3>

      <div className="
        bg-gray-50 
        border border-gray-400 
        rounded-lg 
        p-4 
        font-mono 
        text-sm 
        whitespace-pre-wrap 
        min-h-30
        max-h-75
        overflow-auto
      ">
        {output || <span className="text-gray-400">Belum ada output...</span>}
      </div>
    </div>
  );
}