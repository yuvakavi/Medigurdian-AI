/**
 * Surface container used across the application.
 */
export default function Card({
  children,
  className = '',
  as: Tag = 'section',
  padded = true,
  hover = false,
  ...rest
}) {
  return (
    <Tag
      className={[
        'min-w-0 rounded-2xl border border-hairline bg-panel shadow-card',
        padded ? 'p-5 sm:p-6' : '',
        hover
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
