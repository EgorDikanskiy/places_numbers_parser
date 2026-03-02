const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF3B82F6' },
}

const HEADER_FONT = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
}

const COLUMNS = [
  { header: '№',         key: 'index',      width: 8 },
  { header: 'Название',  key: 'name',       width: 40 },
  { header: 'Телефон',   key: 'phones',     width: 30 },
  { header: 'Адрес',     key: 'address',    width: 50 },
  { header: 'Категория', key: 'categories', width: 30 },
]

function styleHeaderRow(worksheet) {
  const headerRow = worksheet.getRow(1)
  headerRow.font = HEADER_FONT
  headerRow.fill = HEADER_FILL
  headerRow.alignment = { vertical: 'middle' }
  headerRow.height = 28
}

function triggerDownload(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportToExcel(results, filename) {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.default.Workbook()
  const worksheet = workbook.addWorksheet('Заведения')

  worksheet.columns = COLUMNS
  styleHeaderRow(worksheet)

  results.forEach((item, i) => {
    worksheet.addRow({
      index: i + 1,
      name: item.name,
      phones: item.phones,
      address: item.address,
      categories: item.categories,
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  triggerDownload(buffer, filename)
}
