sap.ui.define(["sap/ui/core/mvc/Controller"], (Controller) => {
  "use strict";

  return Controller.extend(
    "com.povimwithocrsupplier.povimwithocrsupplierside.controller.InvoiceList",
    {
      onInit() {
        this.getOwnerComponent()
          .getRouter()
          .getRoute("RouteInvoiceList")
          .attachPatternMatched(this._onPatternMatched, this);
      },

      _onPatternMatched: function (oEvent) {
        const oSmartTable = this.byId("idPendingInvoicesTable");

        // Set busy state and rebind the table
        if (oSmartTable) {
          // oSmartTable.setBusy(true);
          oSmartTable.rebindTable(true);
        }
      },

      onCreatePress: function (oEvent) {
        this.getOwnerComponent().getRouter().navTo("RouteCreateInvoice");
      },

      onIconTabBarSelect: function (oEvent) {
        const oIconTabBar = oEvent.getSource();
        const sSelectedKey = oIconTabBar.getSelectedKey();

        // Get the ID of the SmartTable based on the selected tab key
        let sSmartTableId;
        if (sSelectedKey.includes("idPendingInvoices")) {
          sSmartTableId = "idPendingInvoicesTable";
        } else if (sSelectedKey.includes("filter1")) {
          sSmartTableId = "idApprovedInvoicesTable";
        } else if (sSelectedKey.includes("idRejectedInvoices")) {
          sSmartTableId = "idRejectedInvoicesTable";
        }

        // Find the SmartTable control
        const oSmartTable = this.byId(sSmartTableId);

        // Set busy state and rebind the table
        if (oSmartTable) {
          // oSmartTable.setBusy(true);
          oSmartTable.rebindTable(true);
        }
      },

      onInvoiceItemPress: function (oEvent) {
        const selectedItem = oEvent.getSource();
        const context = selectedItem.getBindingContext();
        const poNumber = context.getProperty("PO_NUMBER");
        const status = context.getProperty("STATUS_DESC");
        const reqNumber = context.getProperty("REQUEST_NO");

        this.getOwnerComponent().getRouter().navTo("RouteInvoiceDetails", {
          poNumber,
          reqNumber,
        });
      },

      formatStatusState: function (sStatus) {
        // Check if sStatus is null or undefined
        if (!sStatus) {
          return "None"; // or any other default state like "Indication05"
        }

        // Now, perform the status check
        if (sStatus.toLowerCase().includes("in-process")) {
          return "Indication17";
        } else if (sStatus === "Approved") {
          return "Indication13";
        } else if (sStatus === "Rejected") {
          return "Indication11";
        }
        return "None";
      },
    }
  );
});
