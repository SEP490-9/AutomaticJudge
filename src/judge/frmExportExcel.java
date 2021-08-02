package judge;

import java.awt.HeadlessException;
import java.awt.Toolkit;
import java.io.File;
import java.io.FileNotFoundException;
import javax.swing.JFileChooser;
import javax.swing.JOptionPane;
import javax.swing.JTable;
import javax.swing.filechooser.FileFilter;
import javax.swing.filechooser.FileNameExtensionFilter;

/**
 *
 * @author Nguyen Vuong Khang Hy Email: khanghy3004@gmail.com Automatic Judger
 */
public class frmExportExcel extends javax.swing.JFrame {

    frmJudge parent;

    /**
     * Creates new form frmExportExcel
     *
     * @param parent
     */
    public frmExportExcel(frmJudge parent) {
        initComponents();
        this.setLocationRelativeTo(null);
        this.setIconImage(Toolkit.getDefaultToolkit().getImage(getClass().getResource("/img/btnexport.png")));
        this.parent = parent;
        for (String object : parent.listStuClassName) {
            cmbExport.addItem(object);
        }
    }

    /**
     * This method is called from within the constructor to initialize the form.
     * WARNING: Do NOT modify this code. The content of this method is always
     * regenerated by the Form Editor.
     */
    @SuppressWarnings("unchecked")
    // <editor-fold defaultstate="collapsed" desc="Generated Code">//GEN-BEGIN:initComponents
    private void initComponents() {

        lblExport = new javax.swing.JLabel();
        cmbExport = new javax.swing.JComboBox<>();
        btnExport = new javax.swing.JButton();
        btnCancel = new javax.swing.JButton();

        setTitle("Export Excel");

        lblExport.setText("Select list");

        btnExport.setIcon(new javax.swing.ImageIcon(getClass().getResource("/img/btnCheck.png"))); // NOI18N
        btnExport.setText("Export");
        btnExport.setToolTipText("Cancel");
        btnExport.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                btnExportActionPerformed(evt);
            }
        });

        btnCancel.setIcon(new javax.swing.ImageIcon(getClass().getResource("/img/btnCross.png"))); // NOI18N
        btnCancel.setText("Cancel");
        btnCancel.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                btnCancelActionPerformed(evt);
            }
        });

        javax.swing.GroupLayout layout = new javax.swing.GroupLayout(getContentPane());
        getContentPane().setLayout(layout);
        layout.setHorizontalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addContainerGap()
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addComponent(cmbExport, 0, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                    .addGroup(layout.createSequentialGroup()
                        .addComponent(lblExport)
                        .addGap(0, 215, Short.MAX_VALUE))
                    .addGroup(layout.createSequentialGroup()
                        .addGap(0, 0, Short.MAX_VALUE)
                        .addComponent(btnExport)
                        .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                        .addComponent(btnCancel)))
                .addContainerGap())
        );
        layout.setVerticalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addContainerGap()
                .addComponent(lblExport)
                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.UNRELATED)
                .addComponent(cmbExport, javax.swing.GroupLayout.PREFERRED_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18)
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.BASELINE)
                    .addComponent(btnExport)
                    .addComponent(btnCancel))
                .addContainerGap(javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE))
        );

        pack();
    }// </editor-fold>//GEN-END:initComponents
    /**
     * export student's score NhaNT
     *
     * @param evt
     */
    private void btnExportActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_btnExportActionPerformed
        ExcelHandle tool = new ExcelHandle(parent);
        if (cmbExport.getItemCount() > 0) {
            try {
                JFileChooser fileFile = new JFileChooser();
                fileFile.setAcceptAllFileFilterUsed(false);
                FileFilter filter = new FileNameExtensionFilter("Excel File (.xlsx)", "xlsx");
                fileFile.setFileFilter(filter);
                fileFile.setSelectedFile(new File(cmbExport.getSelectedItem() + ".xlsx"));
                int choice = fileFile.showSaveDialog(this);
                if (choice == JFileChooser.APPROVE_OPTION) { // if option Open file in JFileChooser
                    this.setVisible(false);
                    JTable tbExport = new JTable(parent.tableModelExport);
                    if (tbExport.getRowCount() == 0) {
                        tool.writeToExcell(parent.hmTable.get(cmbExport.getSelectedItem().toString()), fileFile.getSelectedFile(), cmbExport.getSelectedItem().toString());
                    } else {
                        for (int i = 0; i < tbExport.getRowCount(); ++i) {
                            for (int j = 3; j < tbExport.getColumnCount(); ++j) {
                                tbExport.setValueAt(parent.hmTable.get(cmbExport.getSelectedItem().toString()).getValueAt(i, j - 2), i, j);
                            }
                        }
                        tool.writeToExcell(tbExport, fileFile.getSelectedFile(), cmbExport.getSelectedItem().toString());
                    }

                }
                parent.btnExportExcel.setEnabled(true);
            } catch (HeadlessException | FileNotFoundException e) {
                System.out.println(e.getMessage());
            }
        } else {
            JOptionPane.showMessageDialog(null, "Please add the full path!", "Error!", JOptionPane.ERROR_MESSAGE);
            this.setVisible(false);
            parent.btnExportExcel.setEnabled(true);
        }

    }//GEN-LAST:event_btnExportActionPerformed

    private void btnCancelActionPerformed(java.awt.event.ActionEvent evt) {//GEN-FIRST:event_btnCancelActionPerformed
        this.setVisible(false);
        parent.btnExportExcel.setEnabled(true);
    }//GEN-LAST:event_btnCancelActionPerformed
    // Variables declaration - do not modify//GEN-BEGIN:variables
    private javax.swing.JButton btnCancel;
    private javax.swing.JButton btnExport;
    private javax.swing.JComboBox<String> cmbExport;
    private javax.swing.JLabel lblExport;
    // End of variables declaration//GEN-END:variables
}
