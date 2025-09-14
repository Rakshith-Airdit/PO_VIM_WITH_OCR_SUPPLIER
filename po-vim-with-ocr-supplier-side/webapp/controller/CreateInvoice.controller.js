sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
  ],
  (Controller, JSONModel, MessageToast, MessageBox, Fragment) => {
    "use strict";

    return Controller.extend(
      "com.povimwithocrsupplier.povimwithocrsupplierside.controller.CreateInvoice",
      {
        onInit() {
          const oUploadModel = new JSONModel({
            file: null,
            fileName: null,
            fileLoaded: false,
          });
          this.getView().setModel(oUploadModel, "uploadModel");
          this.getOwnerComponent()
            .getRouter()
            .getRoute("RouteInvoiceList")
            .attachPatternMatched(this._onPatternMatched, this);
        },

        onBeforeItemAdded: function (oEvent) {
          const oFile = oEvent.getParameter("item").getFileObject();
          // Check file type and size before allowing the item to be added
          if (oFile.type !== "application/pdf") {
            MessageToast.show("Only PDF files are allowed.");
            oEvent.preventDefault();
            return;
          }
        },

        onAfterItemAdded: function (oEvent) {
          const oItem = oEvent.getParameter("item");
          const oFile = oItem.getFileObject();
          const oUploadModel = this.getView().getModel("uploadModel");

          const blobUrl = URL.createObjectURL(oFile);

          // Get the iframe element directly from the DOM
          const iframe = document.getElementById("pdfFrame");
          if (iframe) {
            // Set the src and make the iframe visible
            iframe.src = blobUrl;
            iframe.style.display = "block"; // or "initial" or "inline"
          }

          // Use FileReader to get the Base64 string for the backend payload
          const oReader = new FileReader();
          oReader.onload = (e) => {
            const base64 = e.target.result.split(",")[1];
            oUploadModel.setProperty("/file", base64);
            oUploadModel.setProperty("/fileName", oFile.name);
            oUploadModel.setProperty("/fileLoaded", true);
            MessageToast.show("PDF loaded for preview.");
          };
          oReader.onerror = (error) => {
            MessageToast.show("Error reading file.");
            console.error(error);
          };
          oReader.readAsDataURL(oFile);

          // Update other UI elements
          this.getView().byId("uploadSet").setVisible(false);
          this.getView().byId("idClearBtn").setVisible(true);
        },

        onClearPreview: function () {
          const iframe = document.getElementById("pdfFrame");
          if (iframe && iframe.src) {
            URL.revokeObjectURL(iframe.src);
            iframe.src = "";
            iframe.style.display = "none";
          }

          const oUploadModel = this.getView().getModel("uploadModel");
          if (oUploadModel) {
            oUploadModel.setProperty("/file", null);
            oUploadModel.setProperty("/fileName", null);
            oUploadModel.setProperty("/fileLoaded", false);
          }

          const oUploadSet = this.getView().byId("uploadSet");
          oUploadSet.removeAllItems();

          // Show the upload control and hide the clear button
          this.getView().byId("uploadSet").setVisible(true);
          this.getView().byId("idClearBtn").setVisible(false);
        },

        _onPatternMatched: function () {
          // This function should reset the view state
          this.onClearPreview();
          this.clearForm();
        },

        onSave: function () {
          const oView = this.getView();
          const oModel = oView.getModel();
          const uploadModel = oView.getModel("uploadModel");

          // 1. Read input values using correct IDs
          const poNumber = oView.byId("idRefPO").getValue();
          const invoiceNumber = oView.byId("idInvoiceNumber").getValue();
          const invoiceAmount = oView.byId("idInvoiceAmount").getValue();
          const invoiceDate = oView.byId("idInvoiceDate").getDateValue();

          const fileURL = uploadModel.getProperty("/file");
          const fileName = uploadModel.getProperty("/fileName");

          // 2. Validate
          if (!poNumber || !invoiceNumber || !invoiceAmount || !invoiceDate) {
            MessageToast.show("Please fill all required fields.");
            return;
          }
          if (!fileURL || !fileName) {
            MessageToast.show("PDF must be uploaded before submission.");
            return;
          }

          const formattedDate = invoiceDate.toISOString().split("T")[0];

          // 3. Construct payload and submit (rest of your code is fine here)
          const payload = {
            action: "CREATE",
            PoVimhead: [
              {
                // SUPPLIER_NAME: "MARDEN INDUSTRIES",
                SUPPLIER_NUMBER: "100264",
                COMPANY_CODE: "1000",
                INVOICE_NO: invoiceNumber,
                INVOICE_DATE: formattedDate,
                INVOICE_AMOUNT: invoiceAmount,
                PO_NUMBER: poNumber,
                SOURCE_TYPE: "02-Portal",
              },
            ],
            PoVimitem: [],
            Attachment: [
              {
                VendorCode: "110346",
                DESCRIPTION: "Vendor Invoice",
                IMAGEURL: fileURL,
                IMAGE_FILE_NAME: fileName,
              },
            ],
          };

          MessageBox.confirm("Do you want to submit this invoice?", {
            title: "Confirm Submission",
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.OK,
            onClose: function (oAction) {
              if (oAction === MessageBox.Action.OK) {
                oView.setBusy(true);
                oModel.create("/PostPOVimDatawithOCR", payload, {
                  success: function (oRes) {
                    let successMessage = oRes.message
                      ? oRes.message
                      : "Invoice submitted successfully.";
                    oView.setBusy(false);
                    this.onClearPreview();
                    this.clearForm();
                    MessageBox.success(successMessage, {
                      onClose: function () {
                        this.getOwnerComponent()
                          .getRouter()
                          .navTo("RouteInvoiceList");
                      }.bind(this),
                    });
                  }.bind(this),
                  error: function (oError) {
                    console.error("Submission error:", oError);
                    oView.setBusy(false);
                    MessageBox.error(
                      "Submission failed. Please try again." + oError
                    );
                  },
                });
              }
            }.bind(this),
          });
        },

        clearForm: function () {
          const oView = this.getView();
          oView.byId("idRefPO").setValue("");
          oView.byId("idInvoiceNumber").setValue("");
          oView.byId("idInvoiceAmount").setValue("");
          oView.byId("idInvoiceDate").setDateValue(null);
        },

        onCancel: function () {
          this.onClearPreview();
          this.clearForm();
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteInvoiceList");
        },

        onExit: function () {
          this.onClearPreview();
          this.clearForm();
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteInvoiceList");
        },
      }
    );
  }
);
