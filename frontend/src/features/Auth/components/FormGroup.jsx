const FormGroup = ({ label, placeholder, value, onChange, type = 'text', autoComplete }) => {
  return (
    <div className="form-group">
      <label htmlFor={label}>{label}:</label>
      <input type={type} id={label} placeholder={placeholder} value={value} onChange={onChange} autoComplete={autoComplete} required />
    </div>
  )
}

export default FormGroup