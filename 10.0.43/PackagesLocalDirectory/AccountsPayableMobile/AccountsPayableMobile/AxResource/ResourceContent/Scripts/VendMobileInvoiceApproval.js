/*

Mobile invoice approval business logic

The following information is for reference if needing to reconfigure pages for this application:
(Format = Name, Page name, Menu item for form navigation)

Invoices for approval,      Invoices,                           VendMobileInvoiceAssignedToMeListPage
Invoice details,            Invoice-details,                    VendMobileInvoiceHeaderDetails        
Invoice lines,              Invoice-lines,                      VendMobileInvoiceLines
Invoice line details,       Invoice-line-details,               VendMobileInvoiceLineDetails
All distributions,          All-distributions,                  VendMobileInvoiceAllDistributionTree
All distributions,          All-distributions-no-parents,       VendMobileInvoiceAllDistributionTreeNoParents
All distributions,          All-distributions-ext-price,        VendMobileInvoiceAllDistributionTreeExtPrice
Header distributions,       Header-distributions,               VendMobileInvoiceHeaderDistributionTree
Header distributions,       Header-distributions-no-parents,    VendMobileInvoiceHeaderDistributionTreeNoParents
Line distributions,         Line-distributions,                 VendMobileInvoiceLineDistributionTree
Line distributions,         Line-distributions-no-parents,      VendMobileInvoiceLineDistributionTree
Line distributions,         Line-distributions-ext-price,       VendMobileInvoiceLineDistributionTree
Distribution details,       Distribution-details,               VendMobileInvoiceDistributionTreeDetails
Ledger account segments,    Ledger-account-segments,            VendMobileInvoiceDistributionDetails

*/

function main(metadataService, dataService, cacheService, $q) {

    var isMatchingEnabled;
    var isTotalsEnabled;
    var acceptLabel;
    var approveLabel;
    var completeLabel;
    var rejectLabel;
    var delegateLabel;
    var requestChangeLabel;
    var resubmitLabel;
    var recallLabel;
    var distributionsLabel;
    var attachmentsLabel;
    var moreLabel;
    var newVersionLabel;
    var newVersionDescriptionLabel;

    var isRepeatedTopLevelSourceDocument = false;
    var previousSourceDocumentRecId;

    // Business logic initialization event handlers
    var workspaceInitialization = function (appMetadata) {
        // Application configuration
        appConfigurations.populateSettingsFromConfig(appMetadata.Configs.VendMobileInvoiceApprovalConfig);

        // Hide root navigation items that we don't want to display to the end user.
        metadataService.hideNavigation(
            pageNames.HeaderDistributions,
            pageNames.HeaderDistributionsNoParents,
            pageNames.AllDistributions,
            pageNames.AllDistributionsExtPrice,
            pageNames.AllDistributionsNoParents,
            pageNames.InvoiceLines,
            pageNames.DistributionDetails,
            pageNames.LineDistributions,
            pageNames.LineDistributionsExtPrice,
            pageNames.LineDistributionsNoParents,
            pageNames.DelegateUsers
        );

        // Workspace configuration
        if (!metadataService.version) {
            metadataService.configureWorkspace({ design: designHandlers.getNewVersionRequiredWorkspaceDesign() });
            var workspaceMetadata = metadataService.findPage("$workspace");
            workspaceMetadata.OnInit = function (pageInstance) {
                var controlInstance = pageInstance.getControl("$NewVersionRequired_Message");
                if (controlInstance) {
                    controlInstance.metadata().Label = newVersionLabel;
                    controlInstance.metadata().Description = newVersionDescriptionLabel;
                }
            }
        }
        else {
            metadataService.configureWorkspace({ design: designHandlers.getInvoicesForApprovalDesign() });
        }

        // Configure pages
        metadataService.configurePage(pageNames.InvoiceDetails,
            {
                design: designHandlers.getInvoiceDetailsDesign(),
                onDataLoaded: dataHandlers.invoiceDetailsOnDataLoaded,
                onInit: dataHandlers.invoiceDetailsOnInit
            });
        metadataService.configurePage(pageNames.InvoiceDetailsOverflow,
            {
                design: designHandlers.getInvoiceDetailsWorkflowOverflowDesign(),
                onDataLoaded: dataHandlers.invoiceDetailsWorkflowOverflowOnDataLoaded,
                onInit: dataHandlers.invoiceDetailsWorkflowOverflowOnInit
            });
        metadataService.configurePage(pageNames.InvoiceLineDetails,
            {
                design: designHandlers.getInvoiceLineDetailsDesign(),
                onDataLoaded: dataHandlers.invoiceLineDetailsOnDataLoaded
            });
        metadataService.configurePage(pageNames.AllDistributions,
            {
                design: designHandlers.getAllDistributionsDesign(),
                onDataLoaded: dataHandlers.distributionsOnDataLoaded
            });
        metadataService.configurePage(pageNames.LineDistributions,
            {
                design: designHandlers.getLineDistributionsDesign(),
                onDataLoaded: dataHandlers.lineDistributionsOnDataLoaded
            });
        metadataService.configurePage(pageNames.LedgerAccountSegments, { design: designHandlers.getLedgerAccountSegments() });
        metadataService.configurePage(pageNames.InvoiceDetailsAttachments,
            {
                design: designHandlers.getAttachments(),
                onInit: dataHandlers.invoiceDetailsAttachmentsOnInit
            });
        metadataService.configurePage(pageNames.InvoiceLineDetailsAttachments,
            {
                design: designHandlers.getLineAttachments(),
                onInit: dataHandlers.invoiceDetailsAttachmentsOnInit
            });
        metadataService.configurePage(pageNames.InvoiceDetailsAttachmentDetails, { design: designHandlers.getAttachmentDetails() });
        metadataService.configurePage(pageNames.InvoiceLineDetailsAttachmentDetails, { design: designHandlers.getLineAttachmentDetails() });
        metadataService.configurePage(pageNames.DelegateUsers,
            {
                design: designHandlers.getDelegateUsers(),
                onDataLoaded: dataHandlers.delegateUsersOnDataLoaded
            });

        // Configure entity
        metadataService.configureEntity(entityNames.VendInvoiceInfoTable, { onReconcile: dataHandlers.invoicesOnReconcile });

        // Hide fields from filter for Invoice details
        metadataService.configureControl(pageNames.InvoiceDetails, "PurchParmLine_ReceiveNow", { hidden: true });
        metadataService.configureControl(pageNames.InvoiceDetails, "PurchParmLine_PurchPrice_line", { hidden: true });
        metadataService.configureControl(pageNames.InvoiceDetails, "VendInvoiceInfoLine_PurchUnit", { hidden: true });

        // Hide attachment count fields
        metadataService.configureControl(pageNames.InvoiceDetails, commonControlNames.AttachmentCount, { hidden: true });
        metadataService.configureControl(pageNames.InvoiceLineDetails, commonControlNames.AttachmentCount, { hidden: true });

        // Hide Mobile workflow status controls
        metadataService.configureControl(pageNames.InvoiceDetails, commonControlNames.MobileWorkflowStatus, { hidden: true });
        metadataService.configureControl(pageNames.Invoices, commonControlNames.MobileWorkflowStatus, { hidden: true });
        metadataService.configureControl(pageNames.InvoiceDetailsOverflow, commonControlNames.MobileWorkflowStatus, { hidden: true });

        // Configure workflow actions to re-direct
        metadataService.configureAction(actionNames.Accept, { onComplete: dataHandlers.workflowActionOnComplete });
        metadataService.configureAction(actionNames.Approve, { onComplete: dataHandlers.workflowActionOnComplete });
        metadataService.configureAction(actionNames.Reject, { onComplete: dataHandlers.workflowActionOnComplete });
        metadataService.configureAction(actionNames.Delegate, { onComplete: dataHandlers.workflowActionOnComplete });
        metadataService.configureAction(actionNames.RequestChange, { onComplete: dataHandlers.workflowActionOnComplete });
        metadataService.configureAction(actionNames.Recall, { onComplete: dataHandlers.workflowActionOnComplete });
        metadataService.configureAction(actionNames.Complete, { onComplete: dataHandlers.workflowActionOnComplete });
        metadataService.configureAction(actionNames.Resubmit, { onComplete: dataHandlers.workflowActionOnComplete });

        // Distribution related controls to be hidden that need to be present, but not visible
        metadataService.configureControl(pageNames.DistributionDetails, commonControlNames.AccountingDistributionRecId, { hidden: true });
        metadataService.configureControl(pageNames.AllDistributions, commonControlNames.AccountingDistributionRecId, { hidden: true });
        metadataService.configureControl(pageNames.LineDistributions, commonControlNames.AccountingDistributionRecId, { hidden: true });

        metadataService.configureControl(pageNames.AllDistributions, commonControlNames.DistributionTopLevelSourceDocumentLine, { hidden: true });
        metadataService.configureControl(pageNames.LineDistributions, commonControlNames.DistributionTopLevelSourceDocumentLine, { hidden: true });

        metadataService.configureControl(pageNames.AllDistributions, commonControlNames.DistributionTreeNodeType, { hidden: true });
        metadataService.configureControl(pageNames.LineDistributions, commonControlNames.DistributionTreeNodeType, { hidden: true });

        // Lookup configuration for delegate users
        metadataService.configureLookup(actionNames.Delegate, commonControlNames.UserLookupControl,
            {
                lookupPage: pageNames.DelegateUsers, valueField: commonControlNames.UserLookupValueField, displayField: commonControlNames.UserLookupDisplayField, showLookupPage: true
            });
        metadataService.configureLookup(actionNames.RequestChange, commonControlNames.UserLookupControl,
            {
                lookupPage: pageNames.DelegateUsers, valueField: commonControlNames.UserLookupValueField, displayField: commonControlNames.UserLookupDisplayField, showLookupPage: true
            });
    }

    // Page initialization
    var pageInitialization = function (pageMetadata, context) { };

    var actionInitialization = function (taskMetadata, context, taskData) { };

    // Pages:
    var pageNames = {
        Invoices: "Invoices",
        InvoiceDetails: "Invoice-details",
        InvoiceDetailsOverflow: "Invoice-details-overflow",
        InvoiceLines: "Invoice-lines",
        InvoiceLineDetails: "Invoice-line-details",
        AllDistributions: "All-distributions",
        AllDistributionsNoParents: "All-distributions-no-parents",
        AllDistributionsExtPrice: "All-distributions-ext-price",
        HeaderDistributions: "Header-distributions",
        HeaderDistributionsNoParents: "Header-distributions-no-parents",
        LineDistributions: "Line-distributions",
        LineDistributionsNoParents: "Line-distributions-no-parents",
        LineDistributionsExtPrice: "Line-distributions-ext-price",
        DistributionDetails: "Distribution-details",
        LedgerAccountSegments: "Ledger-account-segments",
        DelegateUsers: "Delegate-users",
        InvoiceDetailsAttachments: "Invoice-detailsDocList",
        InvoiceDetailsAttachmentDetails: "Invoice-detailsDocDetails",
        InvoiceLineDetailsAttachments: "Invoice-line-detailsDocList",
        InvoiceLineDetailsAttachmentDetails: "Invoice-line-detailsDocDetails",
    };

    // Actions:
    var actionNames = {
        Accept: "Accept",
        Approve: "Approve-workflow",
        Complete: "Complete",
        Delegate: "Delegate",
        Recall: "Recall",
        Reject: "Reject",
        RequestChange: "Request-change",
        Resubmit: "Resubmit",
    };

    // Workflow buttons
    var workflowButtonNames = {
        AcceptButton: "AcceptButton",
        ApproveButton: "ApproveButton",
        CompleteButton: "CompleteButton",
        DelegateButton: "DelegateButton",
        RecallButton: "RecallButton",
        RejectButton: "RejectButton",
        RequestChangeButton: "RequestChangeButton",
        ResubmitButton: "ResubmitButton",
        MoreButton: "MoreButton",
    };

    // Common control names
    var commonControlNames = {
        MobileWorkflowStatus: "VendInvoiceInfoTable_MobileWorkflowStatus",
        AccountingDistributionRecId: "AccountingDistributionRecId",
        UserLookupControl: "User",
        UserLookupValueField: "UserInfo_id",
        UserLookupDisplayField: "UserInfo_name",
        DistributionDescription: "Description",
        DistributionDisplayValue: "DisplayValue",
        DistributionTopLevelSourceDocumentLine: "TopLevelSourceDocumentLine",
        DistributionTreeNodeType: "TreeNodeType",
        Attachments: "Attachments",
        AttachmentCount: "AttachmentCount",
    };

    // Entity names
    var entityNames = {
        VendInvoiceInfoTable: "VendInvoiceInfoTable",
    };

    // Application configuration
    var appConfigurations = {

        // Populate settings values from application configuration
        populateSettingsFromConfig: function (invoiceApprovalConfig) {

            isMatchingEnabled = invoiceApprovalConfig.InvoiceMatchingEnabled;
            isTotalsEnabled = invoiceApprovalConfig.InvoiceTotalsEnabled;
            acceptLabel = invoiceApprovalConfig.AcceptLabel;
            approveLabel = invoiceApprovalConfig.ApproveLabel;
            completeLabel = invoiceApprovalConfig.CompleteLabel;
            rejectLabel = invoiceApprovalConfig.RejectLabel;
            delegateLabel = invoiceApprovalConfig.DelegateLabel;
            requestChangeLabel = invoiceApprovalConfig.RequestChangeLabel;
            resubmitLabel = invoiceApprovalConfig.ResubmitLabel;
            recallLabel = invoiceApprovalConfig.RecallLabel;
            distributionsLabel = invoiceApprovalConfig.DistributionsLabel;
            attachmentsLabel = invoiceApprovalConfig.AttachmentsLabel;
            moreLabel = invoiceApprovalConfig.MoreLabel;
            newVersionLabel = invoiceApprovalConfig.NewVersionLabel;
            newVersionDescriptionLabel = invoiceApprovalConfig.NewVersionDescriptionLabel;
        },
    };

    // Page data loaded handlers
    var dataHandlers = {

        // Called when the VendInvoiceInfoTable entity is reconciled after completing a header workflow action
        invoicesOnReconcile: function (dataWrapper) {

            if (dataWrapper) {
                var state = dataWrapper.getState();
                if (state == 3) {
                    dataWrapper.set("VendInvoiceInfoTable/MobileWorkflowStatus", "1");
                }
            }
        },

        // Handler for the OnComplete event called when header workflow actions are completed
        workflowActionOnComplete: function (navigationOverride) {

            // Redirect to the main workspace page (List of invoices)
            navigationOverride.to = "home";
            navigationOverride.params.pageId = metadataService.findPage("$workspace").Id;
        },

        // Handler for the OnInit event called when the Invoice details page is initialized
        invoiceDetailsOnInit: function (pageInstance) {

            dataHandlers.showHideInvoiceWorkflowActions(pageInstance, false);
        },

        // Handler for the OnDataLoaded event called when the Invoice details page data is loaded
        invoiceDetailsOnDataLoaded: function (pageInstance, dataWrapper) {

            dataHandlers.showHideInvoiceWorkflowActions(pageInstance, false);
            dataHandlers.setAttachmentsControlLabel(pageInstance);
        },

        // Handler for the OnDataLoaded event called when the Invoice line details page data is loaded
        invoiceLineDetailsOnDataLoaded: function (pageInstance) {

            dataHandlers.setAttachmentsControlLabel(pageInstance);
        },

        // Generically sets the attachment control link label value on a page instance
        setAttachmentsControlLabel: function (pageInstance) {

            if (pageInstance) {
                var attachmentsControl = pageInstance.getControl(commonControlNames.Attachments);
                var attachmentCountControl = pageInstance.getControl(commonControlNames.AttachmentCount);

                attachmentsControl.metaData.Label = attachmentsLabel + " (" + attachmentCountControl.getFormattedValue() + ")";
            }
        },

        // Handler for the OnInit event called when the Attachments and Line attachments forms are initialized
        invoiceDetailsAttachmentsOnInit: function (pageInstance) {
            pageInstance.doRefresh();
        },

        // Handler for the OnInit event called when the Invoice details overflow page is initialized
        invoiceDetailsWorkflowOverflowOnInit: function (pageInstance) {

            dataHandlers.showHideInvoiceWorkflowActions(pageInstance, true);
        },

        // Handler for the OnDataLoaded event called when the Invoice details overflow page data is loaded
        invoiceDetailsWorkflowOverflowOnDataLoaded: function (pageInstance, dataWrapper) {

            dataHandlers.showHideInvoiceWorkflowActions(pageInstance, true);
        },

        // Handles showing and hiding workflow actions on a given page instance based on the data from the VendInvoiceInfoTable entity
        showHideInvoiceWorkflowActions: function (pageInstance, expandedMore) {

            if (pageInstance) {
                var entityContextParts = pageInstance.pageOptions.pageContext.split(':');
                var data = dataService.getEntityData(entityContextParts[0], entityContextParts[1]);

                var acceptControl = !!+data.get('VendInvoiceInfoTable/showAccept');
                var approveControl = !!+data.get('VendInvoiceInfoTable/showApprove');
                var rejectControl = !!+data.get('VendInvoiceInfoTable/showReject');
                var delegateControl = !!+data.get('VendInvoiceInfoTable/showDelegate');
                var requestChangeControl = !!+data.get('VendInvoiceInfoTable/showRequestChange');
                var recallControl = !!+data.get('VendInvoiceInfoTable/showRecall');
                var completeControl = !!+data.get('VendInvoiceInfoTable/showComplete');
                var resubmitControl = !!+data.get('VendInvoiceInfoTable/showResubmit');

                var visibleActions = [acceptControl, approveControl, completeControl, resubmitControl, rejectControl, requestChangeControl, delegateControl, recallControl].filter(v => v);
                var visibleActionCount = visibleActions.length;

                // Order of operations: Accept, Approve, Complete, Resubmit, Reject, Request change, Delegate, Recall
                return this.applyWorkflowButtonShowHide(pageInstance, expandedMore, visibleActionCount, acceptControl, approveControl, completeControl, resubmitControl, rejectControl, requestChangeControl, delegateControl, recallControl);
            }
        },

        // Handles the core actions of showing and hiding the header workflow controls based on values provided from the calling methods
        applyWorkflowButtonShowHide: function (pageInstance, expandedMore, maxCount, showAcceptControl, showApproveControl, showCompleteControl,
            showResubmitControl, showRejectControl, showRequestChangeControl, showDelegateControl, showRecallControl) {

            var counter = 0;
            var countUntilMore = expandedMore ? 8 : (maxCount > 3 ? 2 : maxCount);

            var acceptButton = pageInstance.getControl(workflowButtonNames.AcceptButton);
            var approveButton = pageInstance.getControl(workflowButtonNames.ApproveButton);
            var completeButton = pageInstance.getControl(workflowButtonNames.CompleteButton);
            var resubmitButton = pageInstance.getControl(workflowButtonNames.ResubmitButton);
            var rejectButton = pageInstance.getControl(workflowButtonNames.RejectButton);
            var requestChangeButton = pageInstance.getControl(workflowButtonNames.RequestChangeButton);
            var delegateButton = pageInstance.getControl(workflowButtonNames.DelegateButton);
            var recallButton = pageInstance.getControl(workflowButtonNames.RecallButton);
            var moreButton = pageInstance.getControl(workflowButtonNames.MoreButton);

            if (counter < countUntilMore && showAcceptControl) {
                acceptButton.hidden = false;
                counter++;
            }
            else {
                acceptButton.hidden = true;
            }

            if (counter < countUntilMore && showApproveControl) {
                approveButton.hidden = false;
                counter++;
            }
            else {
                approveButton.hidden = true;
            }

            if (counter < countUntilMore && showCompleteControl) {
                completeButton.hidden = false;
                counter++;
            }
            else {
                completeButton.hidden = true;
            }

            if (counter < countUntilMore && showResubmitControl) {
                resubmitButton.hidden = false;
                counter++;
            }
            else {
                resubmitButton.hidden = true;
            }

            if (counter < countUntilMore && showRejectControl) {
                rejectButton.hidden = false;
                counter++;
            }
            else {
                rejectButton.hidden = true;
            }

            if (counter < countUntilMore && showRequestChangeControl) {
                requestChangeButton.hidden = false;
                counter++;
            }
            else {
                requestChangeButton.hidden = true;
            }

            if (counter < countUntilMore && showDelegateControl) {
                delegateButton.hidden = false;
                counter++;
            }
            else {
                delegateButton.hidden = true;
            }

            if (counter < countUntilMore && showRecallControl) {
                recallButton.hidden = false;
                counter++;
            }
            else {
                recallButton.hidden = true;
            }

            if (!expandedMore && maxCount > 3) {
                moreButton.hidden = false;
            }
            else {
                moreButton.hidden = true;
            }
        },

        // Handler for the OnDataLoaded event called when data is finished loading on the entire document distributions page
        distributionsOnDataLoaded: function (pageInstance, dataWrapper) {

            var distributionsList = pageInstance.getControl("InvoiceDistributions");
            dataHandlers.coreDistributionsOnDataLoaded(distributionsList);
        },

        // Handler for the OnDataLoaded event called when data is finished loading on the line distributions page
        lineDistributionsOnDataLoaded: function (pageInstance, dataWrapper) {

            var distributionsList = pageInstance.getControl("LineDistributions");
            dataHandlers.coreDistributionsOnDataLoaded(distributionsList);
        },

        // Core method used by both document and line distribution pages
        coreDistributionsOnDataLoaded: function (distributionsList) {

            if (distributionsList) {
                // Fully load all distributions and apply custom control design formatting
                dataHandlers.expandGridForMaxLoadedData(distributionsList);

                var rows = distributionsList.getRenderedRows();
                if (rows) {
                    previousSourceDocumentRecId = "";

                    for (var i = 0; i < rows.length; i++) {
                        var descriptionControl = rows[i].getControl(commonControlNames.DistributionDescription);
                        var displayValueControl = rows[i].getControl(commonControlNames.DistributionDisplayValue);

                        var sourceDocumentRecId = distributionsList.getControlMetadata(commonControlNames.DistributionTopLevelSourceDocumentLine).getValue(rows[i].item);
                        var treeNodeType = distributionsList.getControlMetadata(commonControlNames.DistributionTreeNodeType).getValue(rows[i].item);

                        if (descriptionControl && displayValueControl && sourceDocumentRecId && treeNodeType) {
                            if (sourceDocumentRecId != previousSourceDocumentRecId) {
                                previousSourceDocumentRecId = sourceDocumentRecId;
                                isRepeatedTopLevelSourceDocument = false;
                            }
                            else {
                                isRepeatedTopLevelSourceDocument = true;
                            }

                            if (treeNodeType == 0) {
                                descriptionControl.parentObject.applyDesign(
                                    { justifyItems: "flex-end" }
                                    );
                                descriptionControl.applyDesign(
                                    {
                                        name: commonControlNames.DistributionDescription,
                                        padding: "none",
                                        fontSize: "small"
                                    }
                                );
                                displayValueControl.applyDesign(
                                    {
                                        name: commonControlNames.DistributionDisplayValue,
                                        fontSize: "small",
                                    }
                                );
                            }
                            else if (treeNodeType == 1) {
                                rows[i].template.applyDesign(
                                    {
                                        fontSize: "small",
                                    });
                            }
                            else if (treeNodeType == 2) {
                                if (!isRepeatedTopLevelSourceDocument) {

                                    rows[i].template.applyDesign(
                                    {
                                        fontSize: "small",
                                        fontWeight: "bold",
                                        background: "lightGray"
                                    });
                                }
                                else {
                                    rows[i].template.applyDesign(
                                    {
                                        fontSize: "small",
                                        fontWeight: "bold",
                                        background: "light"
                                    });
                                }
                            }
                            else if (treeNodeType == 3) {
                                rows[i].template.applyDesign(
                                    {
                                        fontSize: "small",
                                        fontWeight: "bold",
                                        background: "light"
                                    });
                            }
                        }
                    }
                }
            }

            isRepeatedTopLevelSourceDocument = false;
        },

        // Handler for the OnDataLoaded event for the delegate users lookup page
        delegateUsersOnDataLoaded: function (pageInstance, dataWrapper) {

            var usersList = pageInstance.getControl("FormGridControl1");
            dataHandlers.expandGridForMaxLoadedData(usersList);
        },

        // Fully load all records for a given grid regardless of page size
        expandGridForMaxLoadedData: function (gridControl) {

            if (gridControl) {
                var gridData = gridControl.getData();

                if (gridData) {
                    var dataSize = gridData.length;
                    var pageSize = gridControl.infiniteScrollPageSize();
                    var numTimesToLoadAdditional = Math.ceil(dataSize / pageSize);
                    for (i = 0; i < numTimesToLoadAdditional; i++) {
                        gridControl.loadMore();
                        gridControl.getRenderedRows();
                    }
                }
            }
        },
    };

    // Page/Control Design handlers
    var designHandlers = {

        // Provides core button design for workflow buttons
        workflowButtonControl: function (buttonName, buttonLabel, buttonIcon, backgroundColor, targetAction) {
            var obj = {
                name: buttonName,
                type: "Navigation",
                label: buttonLabel,
                style: "button",
                icon: buttonIcon,
                background: backgroundColor,
                height: "2",
                width: "2",
                target: targetAction
            };

            return obj;
        },

        // Accept action button design
        acceptControl: function () {
            return designHandlers.workflowButtonControl(workflowButtonNames.AcceptButton, acceptLabel, "Checkmark", "dark", actionNames.Accept);
        },

        // Approve action button design
        approveControl: function () {
            return designHandlers.workflowButtonControl(workflowButtonNames.ApproveButton, approveLabel, "Checkmark", "dark", actionNames.Approve);
        },

        // Complete action button design
        completeControl: function () {
            return designHandlers.workflowButtonControl(workflowButtonNames.CompleteButton, completeLabel, "Checkmark", "dark", actionNames.Complete);
        },

        // Resubmit action button design
        resubmitControl: function () {
            return designHandlers.workflowButtonControl(workflowButtonNames.ResubmitButton, resubmitLabel, "Sync", "dark", actionNames.Resubmit);
        },

        // Reject action button design
        rejectControl: function () {
            return designHandlers.workflowButtonControl(workflowButtonNames.RejectButton, rejectLabel, "Cancel", "dark", actionNames.Reject);
        },

        // Request change action button design
        requestChangeControl: function () {
            return designHandlers.workflowButtonControl(workflowButtonNames.RequestChangeButton, requestChangeLabel, "Draft", "dark", actionNames.RequestChange);
        },

        // Delegate action button design
        delegateControl: function () {
            return designHandlers.workflowButtonControl(workflowButtonNames.DelegateButton, delegateLabel, "Assign", "dark", actionNames.Delegate);
        },

        // Recall action button design
        recallControl: function () {
            return designHandlers.workflowButtonControl(workflowButtonNames.RecallButton, recallLabel, "Undo", "dark", actionNames.Recall);
        },

        // More... button design
        moreActionsControl: function () {
            return designHandlers.workflowButtonControl(workflowButtonNames.MoreButton, moreLabel, "More", "dark", pageNames.InvoiceDetailsOverflow);
        },

        // Applies the design for the header workflow button controls
        applyWorkflowButtonDesign: function (expandedMore) {

            var design = [];

            design = {
                flexFlow: "row wrap",
                justifyItems: "space-around",
                items:
                [

                ]
            };

            design.items.push(this.acceptControl());
            design.items.push(",");

            design.items.push(this.approveControl());
            design.items.push(",");

            design.items.push(this.completeControl());
            design.items.push(",");

            design.items.push(this.resubmitControl());
            design.items.push(",");

            design.items.push(this.rejectControl());
            design.items.push(",");

            design.items.push(this.requestChangeControl());
            design.items.push(",");

            design.items.push(this.delegateControl());
            design.items.push(",");

            design.items.push(this.recallControl());
            design.items.push(",");

            if (!expandedMore) {
                design.items.push(this.moreActionsControl());
            }

            return design;
        },

        // Applies the design for the Match status control based on configuration data from X++
        applyMatchStatusControlDesign: function (controlName) {

            var design = "";

            if (isMatchingEnabled) {
                design = controlName;
            }

            return design;
        },

        getNewVersionRequiredWorkspaceDesign: function () {
            return {
                items: [
                    {
                        type: "Navigation",
                        name: "$NewVersionRequired_Message",
                        border: "bottom"
                    }
                ]
            };
        },

        // Gets the Invoices for approval page design (Main workspace page)
        getInvoicesForApprovalDesign: function () {
            return {
                flexSize: "1",
                allowScroll: true,
                items:
                [
                    // Part to include all Invoices for approval
                    {
                        // page
                        type: "Part",
                        target: pageNames.Invoices,
                        filterContext: metadataService.getFilterExpression(pageNames.Invoices, "Grid", commonControlNames.MobileWorkflowStatus, "Is", "0"),
                        design:
                        {
                            items:
                            [
                                {
                                    name: "Grid",
                                    flexSize: "1",
                                    hideArrow: true,
                                    hideSearchBar: true,
                                    itemBorder: "solid",
                                    design:
                                    {
                                        flexFlow: "column nowrap",
                                        padding: "none",
                                        border: "none",
                                        items:
                                        [
                                            // Vend ID/Name and total & currency
                                            {
                                                flexFlow: "row nowrap",
                                                alignItems: "flex-end",
                                                flexSize: "1",
                                                justifyItems: "flex-start",
                                                labelPosition: "hidden",
                                                padding: "none",
                                                items:
                                                [
                                                    {
                                                        name: "VendIDAndName",
                                                        padding: "small",
                                                        fontWeight: "bold",
                                                        fontSize: "medium"
                                                    },
                                                ]
                                            },
                                            // Invoice number
                                            {
                                                flexFlow: "row nowrap",
                                                padding: "none",
                                                border: "none",
                                                justifyItems: "space-between",
                                                items:
                                                [
                                                    {
                                                        flexFlow: "row nowrap",
                                                        flexSize: "1",
                                                        alignItems: "center",
                                                        justifyItems: "space-between",
                                                        labelPosition: "hidden",
                                                        items:
                                                        [
                                                            {
                                                                name: "VendInvoiceInfoTable_Num",
                                                                fontSize: "small",
                                                                padding: "small",
                                                            },
                                                            {
                                                                flexFlow: "row nowrap",
                                                                flexSize: "0",
                                                                justifyItems: "flex-end",
                                                                alignItems: "baseline",
                                                                labelPosition: "hidden",
                                                                border: "none",
                                                                padding: "none",
                                                                fontSize: "medium",
                                                                items:
                                                                [
                                                                    {
                                                                        name: "InvoiceTotal",
                                                                        padding: "none",
                                                                        fontWeight: "bold",
                                                                    },
                                                                    {
                                                                        name: "VendInvoiceInfoTable_CurrencyCode",
                                                                        padding: "small",
                                                                        fontSize: "small",
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    },

                                                ]
                                            },
                                            // Last match status and Due date
                                            {
                                                flexFlow: "row nowrap",
                                                padding: "small",
                                                border: "none",
                                                items:
                                                [
                                                    {
                                                        flexFlow: "row nowrap",
                                                        flexSize: "1",
                                                        padding: "none",
                                                        justifyItems: "space-between",
                                                        labelPosition: "inline",
                                                        fontSize: "x-small",
                                                        items:
                                                        [
                                                            this.applyMatchStatusControlDesign("LastMatchVariance"),
                                                            "VendInvoiceInfoTable_FixedDueDate",
                                                            "VendInvoiceInfoTable_MobileWorkflowStatus",
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },

        // Gets the Invoice details page design
        getInvoiceDetailsDesign: function () {
            return {
                // Page root container
                flexFlow: "column nowrap",
                items:
                [
                    // Upper third contains 4 rows
                    {
                        flexFlow: "column nowrap",
                        background: "dark",
                        border: "none",
                        padding: "none",
                        allowScroll: true,
                        color: "light",
                        items: [
                            // Row 1/4 with name
                            {
                                flexFlow: "row nowrap",
                                alignItems: "center",
                                justifyItems: "center",
                                padding: "none",
                                labelPosition: "hidden",
                                fontWeight: "bold",
                                fontSize: "medium",
                                items:
                                [
                                    "VendIDAndName"
                                ]
                            },
                            // Row 2/4 with Invoice number
                            {
                                justifyItems: "center",
                                labelPosition: "hidden",
                                padding: "none",
                                items:
                                [
                                    "PurchParmTable_Num"
                                ]
                            },
                            // Row 3/4 with Match status, Terms of payment, Due date, and Cash discount
                            {
                                flexFlow: "row nowrap",
                                labelPosition: "inline",
                                padding: "small",
                                items: [
                                    // Column 1
                                    {
                                        flexSize: "1",
                                        flexFlow: "column nowrap",
                                        alignItems: "flex-start",
                                        labelPosition: "inline",
                                        items:
                                        [
                                            {
                                                padding: "none",
                                                labelPosition: "inline",
                                                fontSize: "x-small",
                                                items:
                                                [
                                                    this.applyMatchStatusControlDesign("MatchVariance"),
                                                    "PaymTerm",
                                                    "VendInvoiceInfoTable_MobileWorkflowStatus",
                                                ]
                                            }
                                        ]
                                    },
                                    // Column 2
                                    {
                                        flexSize: "1",
                                        flexFlow: "column nowrap",
                                        alignItems: "flex-end",
                                        labelPosition: "inline",
                                        items:
                                        [
                                            {
                                                padding: "none",
                                                labelPosition: "inline",
                                                fontSize: "x-small",
                                                items:
                                                [
                                                    "PurchParmTable_FixedDueDate",
                                                    "CashDisc",
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            // Row 4/4 with the actions
                            this.applyWorkflowButtonDesign(false),
                        ]
                    },
                    // Middle third of page, contains list
                    {
                        flexSize: "1",
                        allowScroll: true,
                        items: [
                            {
                                // List with invoice lines
                                name: "gridParmLine",
                                hideSearchBar: false,
                                hideArrow: true,
                                itemBorder: true,
                                design: {
                                    flexFlow: "row nowrap",
                                    justifyItems: "space-between",
                                    labelPosition: "hidden",
                                    border: "none",
                                    padding: "none",
                                    fontSize: "small",
                                    items:
                                    [
                                        {
                                            name: "InvoiceLineIdentifier",
                                            padding: "small",
                                        },
                                        {
                                            flexSize: "0",
                                            items: [
                                                {
                                                    name: "PurchParmLine_LineAmount",
                                                    padding: "small",
                                                }
                                            ]
                                        }
                                    ]
                                }
                            },
                        ]
                    },
                    // Lower third of page
                    {
                        flexFlow: "row nowrap",
                        itemBorder: "solid",
                        items:
                        [
                            {
                                flexFlow: "row nowrap",
                                flexSize: "1",
                                justifyItems: "flex-end",
                                alignItems: "baseline",
                                border: "none",
                                padding: "none",
                                items:
                                [
                                    {
                                        name: "InvoiceTotal",
                                        labelPosition: "inline",
                                        fontWeight: "bold",
                                        padding: "none",
                                    },
                                    {
                                        name: "VendInvoiceInfoTable_CurrencyCode",
                                        labelPosition: "hidden",
                                        fontSize: "x-small",
                                        padding: "small",
                                    }
                                ]
                            }
                        ]
                    },
                    // Links at the bottom of the page
                    {
                        flexFlow: "column nowrap",
                        flexSize: "0",
                        justifyItems: "space-between",
                        border: "solid",
                        padding: "none",
                        items:
                        [
                            {
                                type: "Navigation",
                                label: distributionsLabel,
                                style: "link",
                                border: "solid",
                                padding: "small",
                                navigation: metadataService.getFormReference(pageNames.AllDistributions),
                            },
                            {
                                type: "Navigation",
                                name: commonControlNames.Attachments,
                                label: attachmentsLabel,
                                style: "link",
                                border: "solid",
                                padding: "small",
                                navigation: metadataService.getFormReference(pageNames.InvoiceDetailsAttachments),
                            },
                            commonControlNames.AttachmentCount
                        ]
                    },
                ]
            }
        },

        // Gets the Invoice details overflow page design (applies for when user clicks the More button)
        getInvoiceDetailsWorkflowOverflowDesign: function () {
            return {
                // Page root container
                flexFlow: "column nowrap",
                items:
                [
                    // Upper third contains 4 rows
                    {
                        flexFlow: "column nowrap",
                        background: "dark",
                        border: "none",
                        padding: "none",
                        allowScroll: true,
                        color: "light",
                        items: [
                            // Row 1/4 with name
                            {
                                flexFlow: "row nowrap",
                                alignItems: "center",
                                justifyItems: "center",
                                padding: "none",
                                labelPosition: "hidden",
                                fontWeight: "bold",
                                fontSize: "medium",
                                items:
                                [
                                    "VendIDAndName"
                                ]
                            },
                            // Row 2/4 with Invoice number
                            {
                                justifyItems: "center",
                                labelPosition: "hidden",
                                padding: "none",
                                items:
                                [
                                    "PurchParmTable_Num"
                                ]
                            },
                            // Row 4/4 with the actions
                            this.applyWorkflowButtonDesign(false),
                        ]
                    },
                ]
            }
        },

        // Gets the Invoice line details page design
        getInvoiceLineDetailsDesign: function () {
            return {
                // Page root container
                flexFlow: "column wrap",
                alignItems: "space-between",
                contentPage: pageNames.InvoiceLineDetails,
                items:
                [
                    {
                        flexFlow: "column wrap",
                        flexSize: "1",
                        items:
                        [
                            // Upper third contains 3 rows
                            {
                                flexFlow: "column nowrap",
                                flexSize: "1",
                                background: "dark",
                                border: "none",
                                padding: "none",
                                allowScroll: true,
                                color: "light",
                                items:
                                [
                                    // Row 1/3 with Name
                                    {
                                        flexFlow: "row nowrap",
                                        alignItems: "center",
                                        justifyItems: "center",
                                        labelPosition: "hidden",
                                        fontWeight: "bold",
                                        fontSize: "medium",
                                        items:
                                        [
                                            "VendIdAndNameLine"
                                        ]
                                    },
                                    // Row 2/3 with Invoice number
                                    {
                                        justifyItems: "center",
                                        labelPosition: "hidden",
                                        padding: "none",
                                        items:
                                        [
                                            "InvoiceNumber",
                                        ]
                                    },
                                    // Row 3/3 with Line identifier & Net amount/currency
                                    {
                                        flexFlow: "row nowrap",
                                        alignItems: "flex-end",
                                        flexSize: "1",
                                        justifyItems: "space-between",
                                        labelPosition: "hidden",
                                        padding: "none",
                                        items:
                                        [
                                            // Line identifier and total/currency
                                            {
                                                name: "InvoiceLineItemOrCategory",
                                                padding: "small",
                                                fontWeight: "bold",
                                                fontSize: "small"
                                            },
                                            {
                                                flexFlow: "row nowrap",
                                                flexSize: "0",
                                                justifyItems: "flex-end",
                                                alignItems: "baseline",
                                                labelPosition: "hidden",
                                                border: "none",
                                                padding: "none",
                                                fontSize: "small",
                                                items:
                                                [
                                                    {
                                                        name: "PurchParmLine_LineAmount",
                                                        padding: "none",
                                                        fontSize: "small",
                                                        fontWeight: "bold",
                                                    },
                                                    {
                                                        name: "VendInvoiceInfoLine_currencyCode",
                                                        padding: "small",
                                                        fontSize: "x-small",
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                flexFlow: "column wrap",
                                flexSize: "1",
                                background: "white",
                                border: "none",
                                padding: "small",
                                allowScroll: true,
                                fontSize: "small",
                                items:
                                [
                                    "itemName",
                                    "PurchParmLine_ReceiveNow",
                                    "VendInvoiceInfoLine_PurchUnit",
                                    "PurchParmLine_PurchPrice_line",
                                    "PurchParmLine_OrigPurchId",
                                    "PurchParmLine_DocumentId",
                                ]
                            },
                        ]
                    },
                    {
                        // Lower third of page
                        flexFlow: "column wrap",
                        flexSize: "0",
                        justifyItems: "space-between",
                        border: "solid",
                        items:
                        [
                            {
                                type: "Navigation",
                                label: distributionsLabel,
                                style: "link",
                                border: "solid",
                                padding: "small",
                                navigation: metadataService.getFormReference(pageNames.LineDistributions),
                            },
                            {
                                type: "Navigation",
                                name: commonControlNames.Attachments,
                                label: attachmentsLabel,
                                style: "link",
                                border: "solid",
                                padding: "small",
                                navigation: metadataService.getFormReference(pageNames.InvoiceLineDetailsAttachments),
                            },
                            commonControlNames.AttachmentCount
                        ]
                    },
                ]
            }
        },

        // Gets the base design for all of the Distributions pages based on the grid name control provided
        getDistributionDesign: function (gridName) {
            return {
                flexSize: "1",
                allowScroll: true,
                items:
                [
                    {
                        // page
                        flexFlow: "column nowrap",
                        items:
                        [
                            {
                                name: gridName,
                                flexSize: "1",
                                hideSearchBar: true,
                                itemBorder: "solid",
                                design:
                                {
                                    flexFlow: "column nowrap",
                                    justifyItems: "flex-start",
                                    border: "none",
                                    labelPosition: "hidden",
                                    padding: "small",
                                    items:
                                    [
                                        {
                                            flexFlow: "row nowrap",
                                            justifyItems: "flex-start",
                                            border: "none",
                                            labelPosition: "hidden",
                                            padding: "none",
                                            items:
                                            [
                                                commonControlNames.DistributionDescription
                                            ]
                                        },
                                        {
                                            flexFlow: "row nowrap",
                                            justifyItems: "flex-end",
                                            border: "none",
                                            labelPosition: "hidden",
                                            padding: "none",
                                            items:
                                            [
                                                commonControlNames.DistributionDisplayValue,
                                                commonControlNames.AccountingDistributionRecId,
                                                commonControlNames.DistributionTopLevelSourceDocumentLine,
                                                commonControlNames.DistributionTreeNodeType
                                            ]
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        },

        // Gets the All Distribution page design
        getAllDistributionsDesign: function () {
            return designHandlers.getDistributionDesign("InvoiceDistributions");
        },

        // Gets the All Distribution - No parents page design (Alternate implementation in case of customization)
        getAllDistributionsNoParentDesign: function () {
            return designHandlers.getDistributionDesign("InvoiceDistributions");
        },

        // Gets the All Distributions - Ext price only page design (Alternate implementation in case of customization)
        getAllDistributionsExtPriceDesign: function () {
            return designHandlers.getDistributionDesign("InvoiceDistributions");
        },

        // Gets the Line Distribution page design
        getLineDistributionsDesign: function () {
            return designHandlers.getDistributionDesign("LineDistributions");
        },

        // Gets the Line Distributions - No parents page design (Alternate implementation in case of customization)
        getLineDistributionsNoParentDesign: function () {
            return designHandlers.getDistributionDesign("LineDistributions");
        },

        // Gets the Line Distributions - Ext price only page design (Alternate implementation in case of customization)
        getLineDistributionsExtPriceDesign: function () {
            return designHandlers.getDistributionDesign("LineDistributions");
        },

        // Gets the Ledger account segments page design
        getLedgerAccountSegments: function () {
            return {
                flexSize: "1",
                allowScroll: true,
                items:
                [
                    // Part to include all Invoices for approval
                    {
                        // page
                        flexFlow: "column nowrap",
                        items:
                        [
                            {
                                name: "DimensionsGridPermanent",
                                flexSize: "1",
                                itemBorder: "solid",
                                design:
                                {
                                    flexFlow: "column nowrap",
                                    justifyItems: "flex-start",
                                    border: "none",
                                    padding: "small",
                                    items:
                                    [
                                        {
                                            name: "Name",
                                            labelPosition: "hidden",
                                            padding: "none",
                                            fontWeight: "bold"
                                        },
                                        {
                                            flexFlow: "row wrap",
                                            flexSize: "0",
                                            justifyItems: "space-between",
                                            labelPosition: "hidden",
                                            padding: "small",
                                            items:
                                            [
                                                {
                                                    name: "Value",
                                                    padding: "none",
                                                },
                                                {
                                                    name: "Description",
                                                    padding: "none",
                                                }
                                            ]
                                        },
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        },

        // Gets the header level Attachments page design
        getAttachments: function () {
            return designHandlers.getAttachmentsBase("DocuRef_NameCopy2", "DocuRef_TypeCopy1");
        },

        // Gets the line level Attachments page design
        getLineAttachments: function () {
            return designHandlers.getAttachmentsBase("DocuRef_NameCopy2", "DocuRef_TypeCopy1");
        },

        // Gets the base design for all Attachment pages
        getAttachmentsBase: function (nameControl, typeControl) {
            return {
                flexSize: "1",
                allowScroll: true,
                items:
                [
                    // Part to include all Invoices for approval
                    {
                        // page
                        flexFlow: "column nowrap",
                        items:
                        [
                            {
                                name: "Grid",
                                flexSize: "1",
                                hideArrow: true,
                                hideSearchBar: true,
                                itemBorder: "solid",
                                design:
                                {
                                    flexFlow: "row nowrap",
                                    alignItems: "flex-end",
                                    flexSize: "1",
                                    justifyItems: "space-between",
                                    labelPosition: "hidden",
                                    padding: "none",
                                    items:
                                    [
                                        {
                                            name: nameControl,
                                            padding: "std",
                                            fontWeight: "bold",
                                            fontSize: "medium"
                                        },
                                        {
                                            name: typeControl,
                                            padding: "std",
                                            fontSize: "x-small"
                                        },
                                    ]
                                }
                            }
                        ]
                    }
                ]
            }
        },

        // Gets the header level Attachment details page design
        getAttachmentDetails: function () {
            return designHandlers.getAttachmentDetailsBase(pageNames.InvoiceDetailsAttachmentDetails);
        },

        // Gets the line level Attachment details page design
        getLineAttachmentDetails: function () {
            return designHandlers.getAttachmentDetailsBase(pageNames.InvoiceLineDetailsAttachmentDetails);
        },

        // Gets the base design for all Attachment details pages
        getAttachmentDetailsBase: function (pageName) {
            return {
                flexSize: "1",
                allowScroll: true,
                contentPage: pageName,
                items:
                [
                    {
                        flexFlow: "column nowrap",
                        flexSize: "1",
                        items:
                        [
                            // Upper third contains 1 row
                            {
                                flexFlow: "column nowrap",
                                flexSize: "1",
                                background: "dark",
                                border: "none",
                                padding: "none",
                                allowScroll: true,
                                color: "light",
                                items:
                                [
                                    // Row 1
                                    {
                                        flexFlow: "row nowrap",
                                        alignItems: "center",
                                        justifyItems: "center",
                                        padding: "small",
                                        labelPosition: "hidden",
                                        fontWeight: "bold",
                                        fontSize: "medium",
                                        items:
                                        [
                                            "DocuRef_Name"
                                        ]
                                    },
                                ]
                            },
                            {
                                flexFlow: "column",
                                flexSize: "1 1 auto",
                                background: "light",
                                border: "none",
                                padding: "small",
                                allowScroll: true,
                                items:
                                [
                                    "DocuRef_Type",
                                    {
                                        name: "DocuRef_Notes",
                                        extType: "MultilineInput"
                                    },
                                    "Create_createdBy",
                                    "Create_createdDateTime",
                                    {
                                        name: "URL",
                                        extType: "Hyperlink",
                                    }
                                ]
                            },
                        ]
                    },
                ]
            }
        },

        // Gets the Delegate users page design
        getDelegateUsers: function () {
            return {
                flexFlow: "column nowrap",
                items:
                [
                    {
                        name: "FormGridControl1",
                        flexSize: "1",
                        hideSearchBar: false,
                        itemBorder: "none",
                        hideArrow: true,
                        design:
                        {
                            flexFlow: "row nowrap",
                            background: "white",
                            flexSize: "1",
                            justifyItems: "space-between",
                            alignItems: "baseline",
                            border: "none",
                            labelPosition: "hidden",
                            padding: "small",
                            items:
                            [
                                {
                                    name: commonControlNames.UserLookupValueField,
                                    fontWeight: "bold",
                                    fontSize: "small",
                                    padding: "none",
                                },
                                {
                                    name: commonControlNames.UserLookupDisplayField,
                                    fontSize: "small",
                                    padding: "none",
                                }
                            ]
                        }
                    }
                ]
            }
        }
    };

    return {
        appInit: workspaceInitialization,
        pageInit: pageInitialization,
        taskInit: actionInitialization
    };
}

// SIG // Begin signature block
// SIG // MIIoQQYJKoZIhvcNAQcCoIIoMjCCKC4CAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // yfs2ttYb6qL66+5qpJ3lJn6O4T8S+Xk5cUmfXkOZZiCg
// SIG // gg12MIIF9DCCA9ygAwIBAgITMwAABARsdAb/VysncgAA
// SIG // AAAEBDANBgkqhkiG9w0BAQsFADB+MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSgwJgYDVQQDEx9NaWNyb3NvZnQgQ29kZSBT
// SIG // aWduaW5nIFBDQSAyMDExMB4XDTI0MDkxMjIwMTExNFoX
// SIG // DTI1MDkxMTIwMTExNFowdDELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjEeMBwGA1UEAxMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
// SIG // tCg32mOdDA6rBBnZSMwxwXegqiDEUFlvQH9Sxww07hY3
// SIG // w7L52tJxLg0mCZjcszQddI6W4NJYb5E9QM319kyyE0l8
// SIG // EvA/pgcxgljDP8E6XIlgVf6W40ms286Cr0azaA1f7vaJ
// SIG // jjNhGsMqOSSSXTZDNnfKs5ENG0bkXeB2q5hrp0qLsm/T
// SIG // WO3oFjeROZVHN2tgETswHR3WKTm6QjnXgGNj+V6rSZJO
// SIG // /WkTqc8NesAo3Up/KjMwgc0e67x9llZLxRyyMWUBE9co
// SIG // T2+pUZqYAUDZ84nR1djnMY3PMDYiA84Gw5JpceeED38O
// SIG // 0cEIvKdX8uG8oQa047+evMfDRr94MG9EWwIDAQABo4IB
// SIG // czCCAW8wHwYDVR0lBBgwFgYKKwYBBAGCN0wIAQYIKwYB
// SIG // BQUHAwMwHQYDVR0OBBYEFPIboTWxEw1PmVpZS+AzTDwo
// SIG // oxFOMEUGA1UdEQQ+MDykOjA4MR4wHAYDVQQLExVNaWNy
// SIG // b3NvZnQgQ29ycG9yYXRpb24xFjAUBgNVBAUTDTIzMDAx
// SIG // Mis1MDI5MjMwHwYDVR0jBBgwFoAUSG5k5VAF04KqFzc3
// SIG // IrVtqMp1ApUwVAYDVR0fBE0wSzBJoEegRYZDaHR0cDov
// SIG // L3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9jcmwvTWlj
// SIG // Q29kU2lnUENBMjAxMV8yMDExLTA3LTA4LmNybDBhBggr
// SIG // BgEFBQcBAQRVMFMwUQYIKwYBBQUHMAKGRWh0dHA6Ly93
// SIG // d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvY2VydHMvTWlj
// SIG // Q29kU2lnUENBMjAxMV8yMDExLTA3LTA4LmNydDAMBgNV
// SIG // HRMBAf8EAjAAMA0GCSqGSIb3DQEBCwUAA4ICAQCI5g/S
// SIG // KUFb3wdUHob6Qhnu0Hk0JCkO4925gzI8EqhS+K4umnvS
// SIG // BU3acsJ+bJprUiMimA59/5x7WhJ9F9TQYy+aD9AYwMtb
// SIG // KsQ/rst+QflfML+Rq8YTAyT/JdkIy7R/1IJUkyIS6srf
// SIG // G1AKlX8n6YeAjjEb8MI07wobQp1F1wArgl2B1mpTqHND
// SIG // lNqBjfpjySCScWjUHNbIwbDGxiFr93JoEh5AhJqzL+8m
// SIG // onaXj7elfsjzIpPnl8NyH2eXjTojYC9a2c4EiX0571Ko
// SIG // mhENF3RtR25A7/X7+gk6upuE8tyMy4sBkl2MUSF08U+E
// SIG // 2LOVcR8trhYxV1lUi9CdgEU2CxODspdcFwxdT1+G8YNc
// SIG // gzHyjx3BNSI4nOZcdSnStUpGhCXbaOIXfvtOSfQX/UwJ
// SIG // oruhCugvTnub0Wna6CQiturglCOMyIy/6hu5rMFvqk9A
// SIG // ltIJ0fSR5FwljW6PHHDJNbCWrZkaEgIn24M2mG1M/Ppb
// SIG // /iF8uRhbgJi5zWxo2nAdyDBqWvpWxYIoee/3yIWpquVY
// SIG // cYGhJp/1I1sq/nD4gBVrk1SKX7Do2xAMMO+cFETTNSJq
// SIG // fTSSsntTtuBLKRB5mw5qglHKuzapDiiBuD1Zt4QwxA/1
// SIG // kKcyQ5L7uBayG78kxlVNNbyrIOFH3HYmdH0Pv1dIX/Mq
// SIG // 7avQpAfIiLpOWwcbjzCCB3owggVioAMCAQICCmEOkNIA
// SIG // AAAAAAMwDQYJKoZIhvcNAQELBQAwgYgxCzAJBgNVBAYT
// SIG // AlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQH
// SIG // EwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
// SIG // cG9yYXRpb24xMjAwBgNVBAMTKU1pY3Jvc29mdCBSb290
// SIG // IENlcnRpZmljYXRlIEF1dGhvcml0eSAyMDExMB4XDTEx
// SIG // MDcwODIwNTkwOVoXDTI2MDcwODIxMDkwOVowfjELMAkG
// SIG // A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAO
// SIG // BgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29m
// SIG // dCBDb3Jwb3JhdGlvbjEoMCYGA1UEAxMfTWljcm9zb2Z0
// SIG // IENvZGUgU2lnbmluZyBQQ0EgMjAxMTCCAiIwDQYJKoZI
// SIG // hvcNAQEBBQADggIPADCCAgoCggIBAKvw+nIQHC6t2G6q
// SIG // ghBNNLrytlghn0IbKmvpWlCquAY4GgRJun/DDB7dN2vG
// SIG // EtgL8DjCmQawyDnVARQxQtOJDXlkh36UYCRsr55JnOlo
// SIG // XtLfm1OyCizDr9mpK656Ca/XllnKYBoF6WZ26DJSJhIv
// SIG // 56sIUM+zRLdd2MQuA3WraPPLbfM6XKEW9Ea64DhkrG5k
// SIG // NXimoGMPLdNAk/jj3gcN1Vx5pUkp5w2+oBN3vpQ97/vj
// SIG // K1oQH01WKKJ6cuASOrdJXtjt7UORg9l7snuGG9k+sYxd
// SIG // 6IlPhBryoS9Z5JA7La4zWMW3Pv4y07MDPbGyr5I4ftKd
// SIG // gCz1TlaRITUlwzluZH9TupwPrRkjhMv0ugOGjfdf8NBS
// SIG // v4yUh7zAIXQlXxgotswnKDglmDlKNs98sZKuHCOnqWbs
// SIG // YR9q4ShJnV+I4iVd0yFLPlLEtVc/JAPw0XpbL9Uj43Bd
// SIG // D1FGd7P4AOG8rAKCX9vAFbO9G9RVS+c5oQ/pI0m8GLhE
// SIG // fEXkwcNyeuBy5yTfv0aZxe/CHFfbg43sTUkwp6uO3+xb
// SIG // n6/83bBm4sGXgXvt1u1L50kppxMopqd9Z4DmimJ4X7Iv
// SIG // hNdXnFy/dygo8e1twyiPLI9AN0/B4YVEicQJTMXUpUMv
// SIG // dJX3bvh4IFgsE11glZo+TzOE2rCIF96eTvSWsLxGoGyY
// SIG // 0uDWiIwLAgMBAAGjggHtMIIB6TAQBgkrBgEEAYI3FQEE
// SIG // AwIBADAdBgNVHQ4EFgQUSG5k5VAF04KqFzc3IrVtqMp1
// SIG // ApUwGQYJKwYBBAGCNxQCBAweCgBTAHUAYgBDAEEwCwYD
// SIG // VR0PBAQDAgGGMA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0j
// SIG // BBgwFoAUci06AjGQQ7kUBU7h6qfHMdEjiTQwWgYDVR0f
// SIG // BFMwUTBPoE2gS4ZJaHR0cDovL2NybC5taWNyb3NvZnQu
// SIG // Y29tL3BraS9jcmwvcHJvZHVjdHMvTWljUm9vQ2VyQXV0
// SIG // MjAxMV8yMDExXzAzXzIyLmNybDBeBggrBgEFBQcBAQRS
// SIG // MFAwTgYIKwYBBQUHMAKGQmh0dHA6Ly93d3cubWljcm9z
// SIG // b2Z0LmNvbS9wa2kvY2VydHMvTWljUm9vQ2VyQXV0MjAx
// SIG // MV8yMDExXzAzXzIyLmNydDCBnwYDVR0gBIGXMIGUMIGR
// SIG // BgkrBgEEAYI3LgMwgYMwPwYIKwYBBQUHAgEWM2h0dHA6
// SIG // Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvZG9jcy9w
// SIG // cmltYXJ5Y3BzLmh0bTBABggrBgEFBQcCAjA0HjIgHQBM
// SIG // AGUAZwBhAGwAXwBwAG8AbABpAGMAeQBfAHMAdABhAHQA
// SIG // ZQBtAGUAbgB0AC4gHTANBgkqhkiG9w0BAQsFAAOCAgEA
// SIG // Z/KGpZjgVHkaLtPYdGcimwuWEeFjkplCln3SeQyQwWVf
// SIG // Liw++MNy0W2D/r4/6ArKO79HqaPzadtjvyI1pZddZYSQ
// SIG // fYtGUFXYDJJ80hpLHPM8QotS0LD9a+M+By4pm+Y9G6XU
// SIG // tR13lDni6WTJRD14eiPzE32mkHSDjfTLJgJGKsKKELuk
// SIG // qQUMm+1o+mgulaAqPyprWEljHwlpblqYluSD9MCP80Yr
// SIG // 3vw70L01724lruWvJ+3Q3fMOr5kol5hNDj0L8giJ1h/D
// SIG // Mhji8MUtzluetEk5CsYKwsatruWy2dsViFFFWDgycSca
// SIG // f7H0J/jeLDogaZiyWYlobm+nt3TDQAUGpgEqKD6CPxNN
// SIG // ZgvAs0314Y9/HG8VfUWnduVAKmWjw11SYobDHWM2l4bf
// SIG // 2vP48hahmifhzaWX0O5dY0HjWwechz4GdwbRBrF1HxS+
// SIG // YWG18NzGGwS+30HHDiju3mUv7Jf2oVyW2ADWoUa9WfOX
// SIG // pQlLSBCZgB/QACnFsZulP0V3HjXG0qKin3p6IvpIlR+r
// SIG // +0cjgPWe+L9rt0uX4ut1eBrs6jeZeRhL/9azI2h15q/6
// SIG // /IvrC4DqaTuv/DDtBEyO3991bWORPdGdVk5Pv4BXIqF4
// SIG // ETIheu9BCrE/+6jMpF3BoYibV3FWTkhFwELJm3ZbCoBI
// SIG // a/15n8G9bW1qyVJzEw16UM0xghojMIIaHwIBATCBlTB+
// SIG // MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3Rv
// SIG // bjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWlj
// SIG // cm9zb2Z0IENvcnBvcmF0aW9uMSgwJgYDVQQDEx9NaWNy
// SIG // b3NvZnQgQ29kZSBTaWduaW5nIFBDQSAyMDExAhMzAAAE
// SIG // BGx0Bv9XKydyAAAAAAQEMA0GCWCGSAFlAwQCAQUAoIGu
// SIG // MBkGCSqGSIb3DQEJAzEMBgorBgEEAYI3AgEEMBwGCisG
// SIG // AQQBgjcCAQsxDjAMBgorBgEEAYI3AgEVMC8GCSqGSIb3
// SIG // DQEJBDEiBCAK2tVhrp6z/hRZS46uKKetSwXmMDPWcCRe
// SIG // FnNP4uBwxTBCBgorBgEEAYI3AgEMMTQwMqAUgBIATQBp
// SIG // AGMAcgBvAHMAbwBmAHShGoAYaHR0cDovL3d3dy5taWNy
// SIG // b3NvZnQuY29tMA0GCSqGSIb3DQEBAQUABIIBAKBGadrL
// SIG // Stit4Ju6MINU5tdtGn7V0dehfCbj7KAIc5Rdc4ctduyl
// SIG // ExzvZNG8Cl9bUGyadB4SQMT/3TgLusSxFwKC/qWRD/7L
// SIG // CX8/bYIrP6OEFWHDW8xx/TTI7ZJcvkGAXJoigBws+nFo
// SIG // 5UVWWeOSGyN1fzUu0M2HrX7i5iSpyB0d/hoNP0AmFRQ7
// SIG // aTUbKoTOgQxTcmPlBt1ullkvy0Ylk+0sYiH1cH9ew9nD
// SIG // FepRvwElXYbgmlh07eFF1r3qUhvmC4esGCu244tgg39B
// SIG // Z9CgTNrfmgLrX2fNOFvqn1KC2LTMP0vPOzZFlw7V7u0Z
// SIG // 0aS1UdLeenaeg2tUAV65SFqszMehghetMIIXqQYKKwYB
// SIG // BAGCNwMDATGCF5kwgheVBgkqhkiG9w0BBwKggheGMIIX
// SIG // ggIBAzEPMA0GCWCGSAFlAwQCAQUAMIIBWgYLKoZIhvcN
// SIG // AQkQAQSgggFJBIIBRTCCAUECAQEGCisGAQQBhFkKAwEw
// SIG // MTANBglghkgBZQMEAgEFAAQgryhdD1TZVsieM+xWEbTx
// SIG // xJY2LIhbKczdS8X8onjnPEsCBmgSx73xkBgTMjAyNTA1
// SIG // MjAyMzU2NDEuMzI2WjAEgAIB9KCB2aSB1jCB0zELMAkG
// SIG // A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAO
// SIG // BgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29m
// SIG // dCBDb3Jwb3JhdGlvbjEtMCsGA1UECxMkTWljcm9zb2Z0
// SIG // IElyZWxhbmQgT3BlcmF0aW9ucyBMaW1pdGVkMScwJQYD
// SIG // VQQLEx5uU2hpZWxkIFRTUyBFU046NDMxQS0wNUUwLUQ5
// SIG // NDcxJTAjBgNVBAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1w
// SIG // IFNlcnZpY2WgghH7MIIHKDCCBRCgAwIBAgITMwAAAfr7
// SIG // O0TTdzPG0wABAAAB+jANBgkqhkiG9w0BAQsFADB8MQsw
// SIG // CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQ
// SIG // MA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9z
// SIG // b2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNyb3Nv
// SIG // ZnQgVGltZS1TdGFtcCBQQ0EgMjAxMDAeFw0yNDA3MjUx
// SIG // ODMxMTFaFw0yNTEwMjIxODMxMTFaMIHTMQswCQYDVQQG
// SIG // EwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UE
// SIG // BxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENv
// SIG // cnBvcmF0aW9uMS0wKwYDVQQLEyRNaWNyb3NvZnQgSXJl
// SIG // bGFuZCBPcGVyYXRpb25zIExpbWl0ZWQxJzAlBgNVBAsT
// SIG // Hm5TaGllbGQgVFNTIEVTTjo0MzFBLTA1RTAtRDk0NzEl
// SIG // MCMGA1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAgU2Vy
// SIG // dmljZTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoC
// SIG // ggIBAMoWVQTNz2XAXxKQH+3yCIcoMGFVT+uFEnmW0pUU
// SIG // d6byXm72tC0Ag1uOcjq7acCKRsgxl/hGwmx4UuU3eCdG
// SIG // JXPN87SxG20A+zOpKkdF4/p/NnBrHv0JzB9FkWS58IIC
// SIG // XXp6UOlHIjOJzGGb3UI8mwOKnoznvWNO9yZV791SG3ZE
// SIG // B9iRsk/KAfy7Lzy/5AJyeOaECKe0see0T0P9Duqmsidk
// SIG // ia8HIwPGrjHQJ2SjosRZc6KKIe0ssnCOwRDR06ZFSq0V
// SIG // eWHpUb1jU4NaR+BAtijtm8bATdt27THk72RYnhiK/g/J
// SIG // n9ZUELNB7f7TDlXWodeLe2JPsZeT+E8N8XwBoB7L7Gur
// SIG // oK8cJik019ZKlx+VwncN01XigmseiVfsoDOYtTa6CSsA
// SIG // QltdT8ItM/5IvdGXjul3xBPZgpyZu+kHMYt7Z1v2P92b
// SIG // pikOl/4lSCaOy5NGf6QE0cACDasHb86XbV9oTiYm+Bkf
// SIG // IrNm6SpLNOBrq38Hlj5/c+o2OxgQvo7PKUsBnsK338IA
// SIG // GzSpvNmQxb6gRkEFScCB0l6Y5Evht/XsmDhtq3CCwSA5
// SIG // c1MzBRSWzYebQ79xnidxCrwuLzUgMbRn2hv5kISuN2I3
// SIG // r7Ae9i6LlO/K8bTYbjF0s2h6uXxYht83LGB2muPsPmJj
// SIG // K4UxMw+EgIrId+QY6Fz9T9QreFWtAgMBAAGjggFJMIIB
// SIG // RTAdBgNVHQ4EFgQUY4xymy+VlepHdOiqHEB6YSvVP78w
// SIG // HwYDVR0jBBgwFoAUn6cVXQBeYl2D9OXSZacbUzUZ6XIw
// SIG // XwYDVR0fBFgwVjBUoFKgUIZOaHR0cDovL3d3dy5taWNy
// SIG // b3NvZnQuY29tL3BraW9wcy9jcmwvTWljcm9zb2Z0JTIw
// SIG // VGltZS1TdGFtcCUyMFBDQSUyMDIwMTAoMSkuY3JsMGwG
// SIG // CCsGAQUFBwEBBGAwXjBcBggrBgEFBQcwAoZQaHR0cDov
// SIG // L3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9jZXJ0cy9N
// SIG // aWNyb3NvZnQlMjBUaW1lLVN0YW1wJTIwUENBJTIwMjAx
// SIG // MCgxKS5jcnQwDAYDVR0TAQH/BAIwADAWBgNVHSUBAf8E
// SIG // DDAKBggrBgEFBQcDCDAOBgNVHQ8BAf8EBAMCB4AwDQYJ
// SIG // KoZIhvcNAQELBQADggIBALhWwqKxa76HRvmTSR92Pjc+
// SIG // UKVMrUFTmzsmBa4HBq8aujFGuMi5sTeMVnS9ZMoGluQT
// SIG // md8QZT2O1abn+W+Xmlz+6kautcXjq193+uJBoklqEYvR
// SIG // CWsCVgsyX1EEU4Qy+M8SNqWHNcJz6e0OveWx6sGdNnmj
// SIG // gbnYfyHxJBntDn4+iEt6MmbCT9cmrXJuJAaiB+nW9fsH
// SIG // jOKuOjYQHwH9O9MxehfiKVB8obTG0IOfkB3zrsgc67eu
// SIG // wojCUinCd5zFcnzZZ7+sr7bWMyyt8EvtEMCVImy2CTCO
// SIG // hRnErkcSpaukYzoSvS90Do4dFQjNdaxzNdWZjdHriW2w
// SIG // QlX0BLnzizZBvPDBQlDRNdEkmzPzoPwm05KNDOcG1b0C
// SIG // egqiyo7R0qHqABj3nl9uH+XD2Mk3CpWzOi6FHTtj+SUn
// SIG // SObNSRfzp+i4lE+dGnaUbLWWo22BHl/ze0b0m5J9HYw9
// SIG // wb09jn91n/YCHmkCB279Sdjvz+UDj0IlaPPtACpujNEy
// SIG // jnbooYSsQLf+mMpNexb90SHY0+sIi9qkSBLIDiad3yC8
// SIG // OJkET7t7KUX2pEqEHuTdHuB1hX/FltmS9PnPN0M4d1bR
// SIG // DyOmNntgTv3loU2GyGx6amA3wLQGLWmCHXvO2cplxtzD
// SIG // tsFI4S/R70kM46KrqvjqFJr3wVHAdnuS+kAhzuqkzu1q
// SIG // MIIHcTCCBVmgAwIBAgITMwAAABXF52ueAptJmQAAAAAA
// SIG // FTANBgkqhkiG9w0BAQsFADCBiDELMAkGA1UEBhMCVVMx
// SIG // EzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1Jl
// SIG // ZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3Jh
// SIG // dGlvbjEyMDAGA1UEAxMpTWljcm9zb2Z0IFJvb3QgQ2Vy
// SIG // dGlmaWNhdGUgQXV0aG9yaXR5IDIwMTAwHhcNMjEwOTMw
// SIG // MTgyMjI1WhcNMzAwOTMwMTgzMjI1WjB8MQswCQYDVQQG
// SIG // EwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UE
// SIG // BxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENv
// SIG // cnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGlt
// SIG // ZS1TdGFtcCBQQ0EgMjAxMDCCAiIwDQYJKoZIhvcNAQEB
// SIG // BQADggIPADCCAgoCggIBAOThpkzntHIhC3miy9ckeb0O
// SIG // 1YLT/e6cBwfSqWxOdcjKNVf2AX9sSuDivbk+F2Az/1xP
// SIG // x2b3lVNxWuJ+Slr+uDZnhUYjDLWNE893MsAQGOhgfWpS
// SIG // g0S3po5GawcU88V29YZQ3MFEyHFcUTE3oAo4bo3t1w/Y
// SIG // JlN8OWECesSq/XJprx2rrPY2vjUmZNqYO7oaezOtgFt+
// SIG // jBAcnVL+tuhiJdxqD89d9P6OU8/W7IVWTe/dvI2k45GP
// SIG // sjksUZzpcGkNyjYtcI4xyDUoveO0hyTD4MmPfrVUj9z6
// SIG // BVWYbWg7mka97aSueik3rMvrg0XnRm7KMtXAhjBcTyzi
// SIG // YrLNueKNiOSWrAFKu75xqRdbZ2De+JKRHh09/SDPc31B
// SIG // mkZ1zcRfNN0Sidb9pSB9fvzZnkXftnIv231fgLrbqn42
// SIG // 7DZM9ituqBJR6L8FA6PRc6ZNN3SUHDSCD/AQ8rdHGO2n
// SIG // 6Jl8P0zbr17C89XYcz1DTsEzOUyOArxCaC4Q6oRRRuLR
// SIG // vWoYWmEBc8pnol7XKHYC4jMYctenIPDC+hIK12NvDMk2
// SIG // ZItboKaDIV1fMHSRlJTYuVD5C4lh8zYGNRiER9vcG9H9
// SIG // stQcxWv2XFJRXRLbJbqvUAV6bMURHXLvjflSxIUXk8A8
// SIG // FdsaN8cIFRg/eKtFtvUeh17aj54WcmnGrnu3tz5q4i6t
// SIG // AgMBAAGjggHdMIIB2TASBgkrBgEEAYI3FQEEBQIDAQAB
// SIG // MCMGCSsGAQQBgjcVAgQWBBQqp1L+ZMSavoKRPEY1Kc8Q
// SIG // /y8E7jAdBgNVHQ4EFgQUn6cVXQBeYl2D9OXSZacbUzUZ
// SIG // 6XIwXAYDVR0gBFUwUzBRBgwrBgEEAYI3TIN9AQEwQTA/
// SIG // BggrBgEFBQcCARYzaHR0cDovL3d3dy5taWNyb3NvZnQu
// SIG // Y29tL3BraW9wcy9Eb2NzL1JlcG9zaXRvcnkuaHRtMBMG
// SIG // A1UdJQQMMAoGCCsGAQUFBwMIMBkGCSsGAQQBgjcUAgQM
// SIG // HgoAUwB1AGIAQwBBMAsGA1UdDwQEAwIBhjAPBgNVHRMB
// SIG // Af8EBTADAQH/MB8GA1UdIwQYMBaAFNX2VsuP6KJcYmjR
// SIG // PZSQW9fOmhjEMFYGA1UdHwRPME0wS6BJoEeGRWh0dHA6
// SIG // Ly9jcmwubWljcm9zb2Z0LmNvbS9wa2kvY3JsL3Byb2R1
// SIG // Y3RzL01pY1Jvb0NlckF1dF8yMDEwLTA2LTIzLmNybDBa
// SIG // BggrBgEFBQcBAQROMEwwSgYIKwYBBQUHMAKGPmh0dHA6
// SIG // Ly93d3cubWljcm9zb2Z0LmNvbS9wa2kvY2VydHMvTWlj
// SIG // Um9vQ2VyQXV0XzIwMTAtMDYtMjMuY3J0MA0GCSqGSIb3
// SIG // DQEBCwUAA4ICAQCdVX38Kq3hLB9nATEkW+Geckv8qW/q
// SIG // XBS2Pk5HZHixBpOXPTEztTnXwnE2P9pkbHzQdTltuw8x
// SIG // 5MKP+2zRoZQYIu7pZmc6U03dmLq2HnjYNi6cqYJWAAOw
// SIG // Bb6J6Gngugnue99qb74py27YP0h1AdkY3m2CDPVtI1Tk
// SIG // eFN1JFe53Z/zjj3G82jfZfakVqr3lbYoVSfQJL1AoL8Z
// SIG // thISEV09J+BAljis9/kpicO8F7BUhUKz/AyeixmJ5/AL
// SIG // aoHCgRlCGVJ1ijbCHcNhcy4sa3tuPywJeBTpkbKpW99J
// SIG // o3QMvOyRgNI95ko+ZjtPu4b6MhrZlvSP9pEB9s7GdP32
// SIG // THJvEKt1MMU0sHrYUP4KWN1APMdUbZ1jdEgssU5HLcEU
// SIG // BHG/ZPkkvnNtyo4JvbMBV0lUZNlz138eW0QBjloZkWsN
// SIG // n6Qo3GcZKCS6OEuabvshVGtqRRFHqfG3rsjoiV5PndLQ
// SIG // THa1V1QJsWkBRH58oWFsc/4Ku+xBZj1p/cvBQUl+fpO+
// SIG // y/g75LcVv7TOPqUxUYS8vwLBgqJ7Fx0ViY1w/ue10Cga
// SIG // iQuPNtq6TPmb/wrpNPgkNWcr4A245oyZ1uEi6vAnQj0l
// SIG // lOZ0dFtq0Z4+7X6gMTN9vMvpe784cETRkPHIqzqKOghi
// SIG // f9lwY1NNje6CbaUFEMFxBmoQtB1VM1izoXBm8qGCA1Yw
// SIG // ggI+AgEBMIIBAaGB2aSB1jCB0zELMAkGA1UEBhMCVVMx
// SIG // EzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1Jl
// SIG // ZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3Jh
// SIG // dGlvbjEtMCsGA1UECxMkTWljcm9zb2Z0IElyZWxhbmQg
// SIG // T3BlcmF0aW9ucyBMaW1pdGVkMScwJQYDVQQLEx5uU2hp
// SIG // ZWxkIFRTUyBFU046NDMxQS0wNUUwLUQ5NDcxJTAjBgNV
// SIG // BAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2Wi
// SIG // IwoBATAHBgUrDgMCGgMVAPeGfm1CZ/pysAbyCOrINDcu
// SIG // 2jw2oIGDMIGApH4wfDELMAkGA1UEBhMCVVMxEzARBgNV
// SIG // BAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQx
// SIG // HjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEm
// SIG // MCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAgUENB
// SIG // IDIwMTAwDQYJKoZIhvcNAQELBQACBQDr1vo6MCIYDzIw
// SIG // MjUwNTIwMTI1NTIyWhgPMjAyNTA1MjExMjU1MjJaMHQw
// SIG // OgYKKwYBBAGEWQoEATEsMCowCgIFAOvW+joCAQAwBwIB
// SIG // AAICB/cwBwIBAAICEmYwCgIFAOvYS7oCAQAwNgYKKwYB
// SIG // BAGEWQoEAjEoMCYwDAYKKwYBBAGEWQoDAqAKMAgCAQAC
// SIG // AwehIKEKMAgCAQACAwGGoDANBgkqhkiG9w0BAQsFAAOC
// SIG // AQEAeUdSkOibpCmqKpTTQanh9gO97QzcLr+QZzfNiwyt
// SIG // j49KAAIvdRU7ZWT5d7sFZ01siUaHUPQC88nU0+MiEkTx
// SIG // PrpgmSotRuEwOVm9B+GtYhhN7/Jo2p5aV511XjaiXUhj
// SIG // 1D+r1et2X6dv79m2LoSPaZYipT5PFMeizIkY0wGEA5aD
// SIG // Q9m4g24TuZ95NvlN+0nVI+dAwcz17TZeBwvLDSeWbIc5
// SIG // A+HMUArSK4U75n/onsI3XNw7KO+uiH/IOAZjIWCRgV0M
// SIG // HZ1HPDdw5XtuNNr5aVTIgmz/S7JhVyYflA1Mq6quj0qS
// SIG // XIyJO3PxkaHedcbM9vYmTE5Q/XsxVIjdPKSgVDGCBA0w
// SIG // ggQJAgEBMIGTMHwxCzAJBgNVBAYTAlVTMRMwEQYDVQQI
// SIG // EwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4w
// SIG // HAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xJjAk
// SIG // BgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1wIFBDQSAy
// SIG // MDEwAhMzAAAB+vs7RNN3M8bTAAEAAAH6MA0GCWCGSAFl
// SIG // AwQCAQUAoIIBSjAaBgkqhkiG9w0BCQMxDQYLKoZIhvcN
// SIG // AQkQAQQwLwYJKoZIhvcNAQkEMSIEIJyCigRX6VCiEAva
// SIG // XEOoS3gWbHrSj57gqYK8wJKpKVrvMIH6BgsqhkiG9w0B
// SIG // CRACLzGB6jCB5zCB5DCBvQQgffJ/LcmvPgdo41P3aSUS
// SIG // MB8Bx6XKOaIDUrWKHG5DnlYwgZgwgYCkfjB8MQswCQYD
// SIG // VQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4G
// SIG // A1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0
// SIG // IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQg
// SIG // VGltZS1TdGFtcCBQQ0EgMjAxMAITMwAAAfr7O0TTdzPG
// SIG // 0wABAAAB+jAiBCDerQPYgqSBMtWwONIc2ZGEInvYv63G
// SIG // QsUhF5yYy40htzANBgkqhkiG9w0BAQsFAASCAgA3+yTc
// SIG // F73OWKRRkZoU0p3CT+8dGNdQ7rGnt/bQh6iJmhqVsSdz
// SIG // BOWbH8P+q6DreDN3ZNjD01gjdZGPWdWJ+BAOkJzWIa7j
// SIG // 8iKhPI1jUt+K8Zdfl4dOd++SbH/1u/j7GSRW2Sd6BCSU
// SIG // ahmv0IqhzZXj6JDRwzeEurYnbS+pK4c2T4ToW2USVfuQ
// SIG // My4UXBYCdjjjEbBmSK/0w8aHMLzPllIKNp9KT1ycIRH0
// SIG // bnYcei2lRW3kOSTuIFVMzBKllP3KNJC2GpujikgZOrxY
// SIG // B+xnMf3+zTLgRV754wo4d3JySR1tA1apbyhWiSvDn9Ec
// SIG // 7VvlYrsZMfV3R9SsYcySMIfe8AW7XnMkSdJP8BvV+xJx
// SIG // vR97/2/Gjj/9u5bWFkD/7mfRlPVONE6Mn1ddaDGK7BOc
// SIG // 00XxtXvlupjsfqMqqwUBkye4RQn6a55Qy5tZv9n1xJzc
// SIG // RHR7WDPr7Udoj4hwgs2mSujUVQWZ1Z90l0I0405cySco
// SIG // jqRDyeZL/GtjqYzymo6jm0yfN8/UpNtssw7rfqRm3Hm+
// SIG // edvDzufse3su47LiFupNb1CzAAO1PvESmC8NgkK5HJFn
// SIG // ZBK9LFutn8P/wd62SEoRfAbBOGsf3yR02vWNlidqjqh/
// SIG // e57KMDYTn0TDkQXRKfwK0rlbsDhx+h5JmvjVqHM3MnSf
// SIG // hGHSTUcsOzVabcov6g==
// SIG // End signature block
