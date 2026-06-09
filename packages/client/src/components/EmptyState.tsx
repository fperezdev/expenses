import { memo } from "react";

interface Props {
  cta?: string;
  onClick?: () => void;
  message?: string;
  detail?: string;
}

const EmptyState = memo(function EmptyState({
  cta,
  onClick,
  message = "Sin datos",
  detail,
}: Props) {
  return (
    <div className="py-12 text-center text-gray-400">
      <p className="text-lg">{message}</p>
      {detail && <p className="mt-1 text-sm">{detail}</p>}
      {cta && onClick && (
        <button
          onClick={onClick}
          className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white"
        >
          {cta}
        </button>
      )}
    </div>
  );
});

export default EmptyState;
