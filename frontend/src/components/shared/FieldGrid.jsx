import React from 'react'

export default function FieldGrid({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={['field-grid', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Component>
  )
}
