sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
  ],
  (Controller, JSONModel, MessageToast, MessageBox, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend(
      "com.povimwithocrsupplier.povimwithocrsupplierside.controller.InvoiceDetails",
      {
        onInit() {
          this.getOwnerComponent()
            .getRouter()
            .getRoute("RouteInvoiceDetails")
            .attachPatternMatched(this._onPatternMatched, this);
        },

        _initializeModels: function () {
          this.getView().setModel(
            new JSONModel({ results: [] }),
            "oHeaderModel"
          );
          this.getView().setModel(
            new JSONModel({ results: [] }),
            "oOCRHeaderModel"
          );
          this.getView().setModel(
            new JSONModel({ results: [] }),
            "oItemsModel"
          );
          this.getView().setModel(
            new JSONModel({ attachments: [] }),
            "oAttachmentsModel"
          );
          this.getView().setModel(
            new JSONModel({ isEditMode: false, isResubmitVisible: false }),
            "oEditStateModel"
          );
        },

        _onPatternMatched: async function (oEvent) {
          const poNumber = oEvent.getParameter("arguments").poNumber;
          const reqNumber = oEvent.getParameter("arguments").reqNumber;

          if (!poNumber) {
            MessageBox.error("PO Number Not Found!!. Please try again.");
            return;
          }

          if (!reqNumber) {
            MessageBox.error("Request Number Not Found!!. Please try again.");
            return;
          }

          this.poNumber = poNumber;
          this.reqNumber = reqNumber;

          this.getView().setBusy(true);

          try {
            this._initializeModels();
            await this._loadData(poNumber, reqNumber);
          } catch (oError) {
            MessageBox.error(`Failed to load data: ${oError.message}`);
          } finally {
            this.getView().setBusy(false);
          }
        },

        _loadData: async function (poNumber, reqNumber) {
          const oHeaderModel = this.getView().getModel("oHeaderModel");
          const oOCRHeaderModel = this.getView().getModel("oOCRHeaderModel");
          const oItemsModel = this.getView().getModel("oItemsModel");
          const oAttachmentsModel =
            this.getView().getModel("oAttachmentsModel");

          let aFilters = [
            new Filter("PO_NUMBER", FilterOperator.EQ, poNumber),
            new Filter("REQUEST_NO", FilterOperator.EQ, reqNumber),
          ];

          let aHeaderFilter = [
            new Filter("Ebeln", FilterOperator.EQ, poNumber),
          ];

          await Promise.all([
            this._loadEntity("/VIM_PO_OCR_HEAD", aFilters, "oHeaderModel"),
            this._loadEntity(
              "/VIM_PO_OCR_HEAD_API",
              aHeaderFilter,
              "oOCRHeaderModel"
            ),
            // this._loadEntity("/VIM_PO_OCR_ITEM", [], "oItemsModel"),
            // this._loadEntity("/Attachment_PO_VIM_OCR", [], "oItemsModel"),
          ]);

          const oHeaderData = oHeaderModel.getProperty("/results/0");
          const oOCRHeaderData = oOCRHeaderModel.getProperty("/results/0");
          // const oItemsData = oItemsModel.getProperty("/results");
          const oItemsData = oHeaderData?.TO_VIM_PO_OCR_ITEM?.results || [];
          const oAttachmentsData = oHeaderData?.ATTACHMENTS?.results || [];

          debugger;
          console.log(
            oHeaderData,
            oOCRHeaderData,
            oItemsData,
            oAttachmentsData
          );

          oItemsModel.setProperty("/results", oItemsData);
          oAttachmentsModel.setProperty("/attachments", oAttachmentsData);

          console.log("Models Data Set");
        },

        _loadEntity: function (sPath, aFilters, sModelName) {
          return new Promise((resolve, reject) => {
            this.getView()
              .getModel()
              .read(sPath, {
                filters: aFilters,
                success: (oData) => {
                  this.getView()
                    .getModel(sModelName)
                    .setProperty("/results", oData.results || []);
                  resolve();
                },
                error: reject,
              });
          });
        },

        onPressEdit: function () {
          let oEditStateModel = this.getView().getModel("oEditStateModel");
          oEditStateModel.setProperty("/isEditMode", true);
        },

        // In your controller
        onPressCancelEdit: function () {
          let oEditStateModel = this.getView().getModel("oEditStateModel");
          oEditStateModel.setProperty("/isEditMode", false);
          // Optionally, refresh the model to discard unsaved changes
          // this.getView().getModel("oItemsModel").refresh(true);
        },

        _showError: function (
          sMessage = "Something went wrong, Please Try Again After Sometime",
          oOptions = {}
        ) {
          const {
            title = "Error",
            actions = [MessageBox.Action.OK],
            onClose,
          } = oOptions;

          MessageBox.error(sMessage, {
            title,
            actions,
            onClose,
          });
        },

        onPreviewPdf: function (oEvent) {
          debugger;
          const oView = this.getView();
          const sUrl = oEvent.getSource().data("imageUrl");

          if (!sUrl) {
            MessageToast.show("No PDF URL available");
            return;
          }
          // debugger;

          document.getElementById("pdfFrame").src = sUrl;

          // Resize panels
          oView.byId("splitterSize").setSize("65%");
          oView.getModel().setProperty("/isPdfVisible", true);
        },

        onClosePdf: function () {
          const oView = this.getView();
          // Resize the splitter to hide the PDF view and show only the ObjectPage
          oView.byId("splitterSize").setSize("100%");
          // Clear the iframe source to stop playback/display
          document.getElementById("pdfFrame").src = "";
          // Set the model property to false to hide the close button
          oView.getModel().setProperty("/isPdfVisible", false);
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

        formatQtyMatchStatus: function (sStatus) {
          // Check if sStatus is null or undefined
          if (!sStatus) {
            return "None"; // or any other default state like "Indication05"
          }

          // Now, perform the status check
          if (sStatus.toLowerCase().includes("partially delivered")) {
            return "Indication13";
          } else if (sStatus === "Pass") {
            return "Indication14";
          } else if (sStatus === "Fail") {
            return "Indication11";
          }
          return "None";
        },

        formatPriceMatchStatus: function (sStatus) {
          // Check if sStatus is null or undefined
          if (!sStatus) {
            return "None"; // or any other default state like "Indication05"
          }

          // Now, perform the status check
          if (sStatus === "Pass") {
            return "Indication14";
          } else if (sStatus === "Fail") {
            return "Indication11";
          }
          return "None";
        },

        _preparePayload: function () {
          var oView = this.getView();
          var oHeadModel = oView.getModel("oHeaderModel");
          var oItemsModel = oView.getModel("oItemsModel");
          var oAttachmentModel = oView.getModel("oAttachmentsModel");

          debugger;
          const {
            REQUEST_NO,
            SUPPLIER_NUMBER,
            COMPANY_CODE,
            SUPPLIER,
            INVOICE_NO,
            INVOICE_DATE,
            PO_NUMBER,
            INVOICE_AMOUNT,
            VENDOR_ADDRESS,
            BANK_ACCOUNT_NO,
            BANK_NAME,
            PURCHASE_ORG,
            PURCHASE_GROUP,
            CURRENCY,
            DOWNPAYMENT_AMOUNT,
            DOWNPAYMENT_PERCENTAGE,
            DOWNPAYMENT_DUE_DATE,
            APPROVED_COMMENT,
            REJECTED_COMMENT,
          } = oHeadModel.getProperty("/results/0");

          return {
            action: "EDIT_RESUBMIT",
            REQUEST_NO: REQUEST_NO,
            PoVimhead: [
              {
                SUPPLIER_NUMBER: SUPPLIER_NUMBER || "",
                COMPANY_CODE: COMPANY_CODE || "",
                SUPPLIER: SUPPLIER || "",
                INVOICE_NO: INVOICE_NO || "",
                INVOICE_DATE: INVOICE_DATE || "",
                PO_NUMBER: PO_NUMBER || "",
                INVOICE_AMOUNT: INVOICE_AMOUNT || "",
                APPROVED_COMMENT: APPROVED_COMMENT || "",
                REJECTED_COMMENT: REJECTED_COMMENT || "",
                VENDOR_ADDRESS: VENDOR_ADDRESS || "",
                BANK_ACCOUNT_NO: BANK_ACCOUNT_NO || "",
                BANK_NAME: BANK_NAME || "",
                PURCHASE_ORG: PURCHASE_ORG || "",
                PURCHASE_GROUP: PURCHASE_GROUP || "",
                CURRENCY: CURRENCY || "",
                DOWNPAYMENT_AMOUNT: DOWNPAYMENT_AMOUNT || "",
                DOWNPAYMENT_PERCENTAGE: DOWNPAYMENT_PERCENTAGE || "",
                DOWNPAYMENT_DUE_DATE: DOWNPAYMENT_DUE_DATE || "",
              },
            ],
            PoVimitem:
              this._cleanItems(oItemsModel.getProperty("/results")) || [],
            Attachment:
              this._cleanItems(oAttachmentModel.getProperty("/attachments")) ||
              [],
          };
        },

        _cleanItems: function (aItems) {
          const excludedProps = new Set([
            "__metadata",
            "_id",
            "ATTACHMENT_ID",
            "REQUEST_NO",
            "STATUS",
          ]);

          return (aItems || []).map((item) => {
            const cleanedItem = {};
            for (const [key, value] of Object.entries(item)) {
              if (!excludedProps.has(key)) {
                cleanedItem[key] = value;
              }
            }
            return cleanedItem;
          });
        },

        onPressReSubmit: function () {
          const oView = this.getView();
          const oModel = oView.getModel();
          const oEditStateModel = this.getView().getModel("oEditStateModel");
          const oPayload = this._preparePayload();

          if (!oPayload) {
            this._showError();
          }

          MessageBox.confirm("Do you want to resubmit this invoice?", {
            title: "Confirm Submission",
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            onClose: function (oAction) {
              if (oAction === MessageBox.Action.OK) {
                oView.setBusy(true);

                oModel.create("/PostNPOVimData", oPayload, {
                  success: function () {
                    oView.setBusy(false);
                    oEditStateModel.setProperty("/isEditMode", false);
                    MessageBox.success("Invoice submitted successfully.", {
                      onClose: function () {
                        this.getOwnerComponent()
                          .getRouter()
                          .navTo("Routeindex");
                      }.bind(this),
                    });
                  }.bind(this),
                  error: function (oError) {
                    console.error("Submission error:", oError);
                    oView.setBusy(false);
                    MessageBox.error("Submission failed. Please try again.");
                  },
                });
              }
            }.bind(this),
          });
        },

        handleClose: function () {
          this.onClosePdf();
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteInvoiceList");
        },

        onExit: function () {
          this.onClosePdf();
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteInvoiceList");
        },
      }
    );
  }
);